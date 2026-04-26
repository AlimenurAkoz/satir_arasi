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

    // Sekmeler arası geçiş
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

    // Şifre doğrulama
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

    // Firebase'den veri çekme
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log("Giriş yapan kullanıcı UID:", user.uid); // Debug için
            try {
                const userDocRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);

                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    console.log("Firestore'dan gelen veri:", userData); // Debug için

                    // Bilgileri Sidebar'a Yaz
                    if (sidebarName) sidebarName.innerText = userData.username || "Kullanıcı Adı";
                    if (sidebarEmail) sidebarEmail.innerText = userData.email || user.email;
                    if (sidebarImg) sidebarImg.src = userData.photoURL || 'img/default-avatar-icon.jpg';
                    if (newDisplayNameInput) newDisplayNameInput.value = userData.username || "";

                    // Navbar Senkronizasyonu (Sayfada bu elementler varsa)
                    const headerUsername = document.getElementById('headerUsername');
                    const headerAvatar = document.getElementById('headerAvatar');

                    if (headerUsername) headerUsername.innerText = userData.username || "Kullanıcı";
                    if (headerAvatar) headerAvatar.src = userData.photoURL || 'img/default-avatar-icon.jpg';

                    // Loader'ı kapat
                    const loader = document.getElementById('loader');
                    if (loader) loader.style.display = 'none';

                } else {
                    console.warn("Firestore'da bu kullanıcıya ait döküman bulunamadı!");
                }
            } catch (error) {
                console.error("Firestore veri çekme hatası:", error);
            }
        } else {
            window.location.href = 'login.html';
        }
    });

    // Profil fotoğrafı güncelleme
    const avatarInput = document.getElementById('avatar-input');
    const avatarPreview = document.getElementById('profile-img-preview');

    if (avatarInput) {
        avatarInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            const user = auth.currentUser;

            if (!file) return;

            if (!user) {
                alert("Oturum süresi dolmuş, lütfen tekrar giriş yapın.");
                return;
            }

            try {
               
                const compressedBase64 = await compressImage(file);

                // Arayüzü anlık güncelle
                if (avatarPreview) avatarPreview.src =compressedBase64;

                // Firestore'daki kullanıcı dökümanını güncelle
                const userRef = doc(db, "users", user.uid);
                await updateDoc(userRef, {
                    photoURL:compressedBase64
                });

                // Firebase Auth üzerindeki profili güncelle
                await updateProfile(user, {
                    photoURL:compressedBase64
                });

                // Navbar'daki küçük avatarı da güncelle
                const headerAvatar = document.getElementById('headerAvatar');
                if (headerAvatar) headerAvatar.src =compressedBase64;

                alert("Profil fotoğrafı başarıyla güncellendi!");

            } catch (error) {
                console.error("Fotoğraf boyutu çok büyük veya hata oluştu:", error);
                alert("Hata: FotoğHata: Fotoğraf boyutu limitleri aşıyor, lütfen daha küçük bir görsel deneyin.");
            }
        });
    }

    // Kullanıcı adı güncelleme
    const updateProfileForm = document.getElementById('update-profile-form');
    if (updateProfileForm) {
        updateProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newName = newDisplayNameInput.value.trim();
            const user = auth.currentUser;

            if (!user || !newName) return;

            try {
                // Mevcut isimle aynı mı kontrolü
                if (newName === user.displayName) {
                    alert("Zaten bu kullanıcı adını kullanıyorsunuz.");
                    return;
                }

                // Kullanıcı adı benzersiz mi kontrolü
                const q = query(collection(db, "users"), where("username", "==", newName));
                const nameCheck = await getDocs(q);

                if (!nameCheck.empty) {
                    alert("Bu kullanıcı adı başka bir üye tarafından alınmış.");
                    return;
                }

                // Firestore Güncelleme
                await updateDoc(doc(db, "users", user.uid), { username: newName });

                // Firebase Auth Profil Güncelleme
                await updateProfile(user, { displayName: newName });

                alert("Kullanıcı adınız başarıyla güncellendi!");

                // Sidebar ve Navbar'daki isimleri anlık güncelle
                if (sidebarName) sidebarName.innerText = newName;
                const headerUsername = document.getElementById('headerUsername');
                if (headerUsername) headerUsername.innerText = newName;

            } catch (error) {
                console.error("Güncelleme hatası:", error);
                alert("Güncelleme hatası: " + error.message);
            }
        });
    }

    // Şifre güncelleme
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

    // Hesabı kalıcı olarak silme
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
});

// --- çıkış işleminin tetiklenmesi ---
const logoutBtn = document.getElementById('logout-btn');

if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth); // Firebase'e çıkış yap dedik
            window.location.href = 'index.html'; // Kullanıcıyı ana sayfaya gönderdik
        } catch (error) {
            alert("Çıkış yapılırken bir hata oluştu: " + error.message);
        }
    });
}

// Resmi küçültüp boyutu optimize eden fonksiyon
const compressImage = (file, maxWidth = 200, maxHeight = 200) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Oranları koruyarak boyutlandır
                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // 0.7 kalitesinde JPEG olarak çıktı aldım(Boyutu inanılmaz düşürür)
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
        };
        reader.onerror = error => reject(error);
    });
};