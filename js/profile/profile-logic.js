import { auth, db } from '../firebase/firebaseConfig.js';
import { 
    onAuthStateChanged, 
    updateProfile, 
    reauthenticateWithCredential, 
    EmailAuthProvider, 
    updatePassword, 
    deleteUser, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";

import { 
    doc, 
    getDoc, 
    updateDoc, 
    deleteDoc, 
    collection, 
    query, 
    where, 
    getDocs 
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENT SEÇİCİLER ---
    const navButtons = document.querySelectorAll('.nav-btn[data-target]');
    const sections = document.querySelectorAll('.settings-section');

    const sidebarName = document.getElementById('display-name-sidebar');
    const sidebarEmail = document.getElementById('user-email-sidebar');
    const sidebarImg = document.getElementById('profile-img-preview');
    const newDisplayNameInput = document.getElementById('new-display-name');

    const newPassInput = document.getElementById('new-password');
    const confirmPassInput = document.getElementById('confirm-new-password');
    const errorMsg = document.getElementById('password-match-error');
    const updatePassBtn = document.getElementById('update-password-btn');

    // --- 1. SEKMELER ARASI GEÇİŞ ---
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            if (!targetId) return;

            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            sections.forEach(section => {
                section.classList.toggle('active', section.id === targetId);
            });
        });
    });

    // --- 2. ŞİFRE DOĞRULAMA KONTROLÜ ---
    function checkPasswords() {
        const p1 = newPassInput.value;
        const p2 = confirmPassInput.value;

        if (p2.length > 0 && p1 !== p2) {
            errorMsg.style.display = 'block';
            confirmPassInput.classList.add('input-error');
            updatePassBtn.disabled = true;
            updatePassBtn.style.opacity = "0.5";
        } else {
            errorMsg.style.display = 'none';
            confirmPassInput.classList.remove('input-error');
            updatePassBtn.disabled = false;
            updatePassBtn.style.opacity = "1";
        }
    }

    if (newPassInput && confirmPassInput) {
        newPassInput.addEventListener('input', checkPasswords);
        confirmPassInput.addEventListener('input', checkPasswords);
    }

    // --- 3. FIREBASE VERİLERİNİ ÇEKME ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const userDocRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);

                if (userDoc.exists()) {
                    const userData = userDoc.data();

                    if (sidebarName) sidebarName.innerText = userData.username || "Kullanıcı";
                    if (sidebarEmail) sidebarEmail.innerText = userData.email;
                    if (sidebarImg) sidebarImg.src = userData.photoURL || 'assets/img/default-avatar.png';
                    if (newDisplayNameInput) newDisplayNameInput.value = userData.username || "";

                    // Navbar Senkronizasyonu
                    const headerUsername = document.getElementById('headerUsername');
                    const headerAvatar = document.getElementById('headerAvatar');
                    const navUserProfile = document.getElementById('navUserProfile');
                    const navLoginBtn = document.getElementById('navLoginBtn');

                    if (headerUsername) headerUsername.innerText = userData.username || "";
                    if (headerAvatar) headerAvatar.src = userData.photoURL || 'assets/img/default-avatar.png';
                    if (navUserProfile) navUserProfile.style.display = 'flex';
                    if (navLoginBtn) navLoginBtn.style.display = 'none';
                }
            } catch (error) {
                console.error("Firestore veri çekme hatası:", error);
            }
        } else {
            window.location.href = 'login.html';
        }
    });

    // --- 4. PROFİL GÜNCELLEME İŞLEMİ ---
    const updateProfileForm = document.getElementById('update-profile-form');
    if (updateProfileForm) {
        updateProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newName = newDisplayNameInput.value.trim();
            const user = auth.currentUser;

            if (!user || !newName) return;

            try {
                if (newName === user.displayName) {
                    alert("Zaten bu kullanıcı adını kullanıyorsunuz.");
                    return;
                }

                const q = query(collection(db, "users"), where("username", "==", newName));
                const nameCheck = await getDocs(q);

                if (!nameCheck.empty) {
                    alert("Bu kullanıcı adı başka bir üye tarafından alınmış.");
                    return;
                }

                await updateDoc(doc(db, "users", user.uid), { username: newName });
                await updateProfile(user, { displayName: newName });

                alert("Kullanıcı adınız başarıyla güncellendi!");
                location.reload();

            } catch (error) {
                alert("Güncelleme hatası: " + error.message);
            }
        });
    }

    // --- 5. ŞİFRE GÜNCELLEME İŞLEMİ ---
    const updatePasswordForm = document.getElementById('update-password-form');
    if (updatePasswordForm) {
        updatePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = auth.currentUser;
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = newPassInput.value;

            try {
                const credential = EmailAuthProvider.credential(user.email, currentPassword);
                await reauthenticateWithCredential(user, credential);
                await updatePassword(user, newPassword);

                alert("Şifreniz başarıyla değiştirildi.");
                updatePasswordForm.reset();
            } catch (error) {
                alert("Hata: Mevcut şifre yanlış veya yeni şifre zayıf. " + error.message);
            }
        });
    }

    // --- 6. ÇIKIŞ YAPMA ---
    const handleLogout = async () => {
        if (confirm("Çıkış yapmak istediğinize emin misiniz?")) {
            try {
                await signOut(auth);
                window.location.href = 'login.html';
            } catch (error) {
                console.error("Çıkış hatası:", error);
            }
        }
    };

    // --- 7. HESABI KALICI OLARAK SİLME ---
    const deleteAccountBtn = document.getElementById('delete-account-btn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', async () => {
            const user = auth.currentUser;
            if (!user) return;

            if (confirm("Hesabınızı silmek istediğinize emin misiniz?") && confirm("Son kararınız mı?")) {
                try {
                    await deleteDoc(doc(db, "users", user.uid));
                    await deleteUser(user);
                    alert("Hesabınız silindi.");
                    window.location.href = 'index.html';
                } catch (error) {
                    if (error.code === 'auth/requires-recent-login') {
                        alert("Lütfen tekrar giriş yapıp silme işlemini deneyin.");
                    } else {
                        alert("Hata: " + error.message);
                    }
                }
            }
        });
    }

    document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
});