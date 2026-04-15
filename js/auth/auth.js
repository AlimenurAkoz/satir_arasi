import { auth, db } from '../firebase/firebaseConfig.js';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

// Resmi metne çevir (base64)
const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

// Seçiciler
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const fileInput = document.getElementById('regPic');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const navLoginBtn = document.getElementById('navLoginBtn');
const navUserProfile = document.getElementById('navUserProfile');
const headerUsername = document.getElementById('headerUsername');
const headerAvatar = document.getElementById('headerAvatar');
const logoutBtn = document.getElementById('logoutBtn');

// Şifre göster/gizle
document.querySelectorAll('.toggle-pass').forEach(btn => {
    btn.addEventListener('click', function () {
        const input = this.parentElement.querySelector('input');
        if (input) {
            const type = input.type === 'password' ? 'text' : 'password';
            input.type = type;
            this.classList.toggle('fa-eye-slash');
            this.classList.toggle('fa-eye');
        }
    });
});

// Oturum takibi
onAuthStateChanged(auth, async (user) => {
    // Mevcut sayfa yolunu küçük harfe çevirerek al
    const currentPath = window.location.pathname.toLowerCase();
    
    const protectedPages = ['my-library.html', 'profile.html', 'stats.html', 'dashboard.html'];
    
    const isProtected = protectedPages.some(page => currentPath.endsWith(page));

    if (user) {// Giriş yapılmış     
        if (navLoginBtn) navLoginBtn.style.display = 'none';
        if (navUserProfile) {
            navUserProfile.style.display = 'flex';
            navUserProfile.style.alignItems = 'center';
        }

        try {
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const data = userSnap.data();
                if (headerUsername) headerUsername.innerText = data.username;
                if (headerAvatar) headerAvatar.src = data.photoURL || 'img/default-avatar-icon.jpg';
            }
        } catch (e) {
            console.error("Firestore verisi çekilirken hata:", e);
        }

        // Kullanıcı giriş yapmışken tekrar login veya register'a gitmeye çalışırsa ana sayfaya at
        if (currentPath.includes("login.html") || currentPath.includes("register.html")) {
            window.location.replace("dashboard.html");
        }

    } else {// Giriş yapılmamış
        if (navLoginBtn) navLoginBtn.style.display = 'block';
        if (navUserProfile) navUserProfile.style.display = 'none';

        // Eğer kullanıcı giriş yapmamışsa ve korumalı bir sayfadaysa ŞAK diye login'e at
        if (isProtected) {
            console.warn("Yetkisiz erişim denemesi! Login sayfasına yönlendiriliyorsunuz.");
            window.location.replace('login.html');
        }
    }
});

// Giriş yapma işlemi
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const loginBtn = loginForm.querySelector('.btn-primary');
        const email = document.getElementById('loginEmail').value;
        const pass = document.getElementById('loginPass').value;

        try {
            loginBtn.innerText = "Giriş yapılıyor...";
            loginBtn.disabled = true;
            await signInWithEmailAndPassword(auth, email, pass);
            window.location.href = 'dashboard.html';
        } catch (error) {
            loginBtn.innerText = "Giriş Yap";
            loginBtn.disabled = false;
            console.error("Giriş hatası:", error);
            alert("E-posta veya şifre hatalı.");
        }
    });
}

// Dosya seçildiğinde isim göster
if (fileInput) {
    fileInput.addEventListener('change', (e) => {
        if (fileNameDisplay) {
            fileNameDisplay.innerText = e.target.files[0] ? e.target.files[0].name : "Henüz dosya seçilmedi";
        }
    });
}

// Kayıt olma işlemi
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = registerForm.querySelector('.btn-primary');
        const username = document.getElementById('regUser').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPass')?.value || document.getElementById('loginPass')?.value;
        const profileFile = fileInput ? fileInput.files[0] : null;

        try {
            submitBtn.innerText = "Hesap Oluşturuluyor...";
            submitBtn.disabled = true;

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            let finalPhotoURL = 'img/default-avatar-icon.jpg';

            if (profileFile) {
                finalPhotoURL = await toBase64(profileFile);
            }

            await updateProfile(user, {
                displayName: username,
                photoURL: finalPhotoURL
            });

            await setDoc(doc(db, "users", user.uid), {
                username: username,
                photoURL: finalPhotoURL,
                email: email,
                createdAt: new Date()
            });

            window.location.href = 'dashboard.html';
        } catch (error) {
            submitBtn.innerText = "Kayıt Ol";
            submitBtn.disabled = false;
            console.error("Kayıt hatası:", error);
            alert("Hata: " + error.message);
        }
    });
}

// Dropdown açık kalma ve kapanma
const profileDropdown = document.querySelector('.user-profile-dropdown');
const dropdownMenu = document.querySelector('.dropdown-menu');

if (profileDropdown && dropdownMenu) {
    let timeout;

    // Menü üzerine gelince kapanmayı engelle
    profileDropdown.addEventListener('mouseenter', () => {
        clearTimeout(timeout);
        dropdownMenu.style.opacity = '1';
        dropdownMenu.style.visibility = 'visible';
        dropdownMenu.style.transform = 'translateY(0)';
    });

    // Menüden ayrılınca kısa bir süre bekle
    profileDropdown.addEventListener('mouseleave', () => {
        timeout = setTimeout(() => {
            dropdownMenu.style.opacity = '0';
            dropdownMenu.style.visibility = 'hidden';
            dropdownMenu.style.transform = 'translateY(10px)';
        }, 300); // 300ms gecikme payı
    });

    // Menünün içine girince kapanma emrini iptal et
    dropdownMenu.addEventListener('mouseenter', () => {
        clearTimeout(timeout);
    });
}

// Çıkış yapma işlemi
if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault(); // Sayfa atlamasını engelle
        if (confirm("Çıkış yapmak istediğinize emin misiniz?")) {
            try {
                await signOut(auth);
                window.location.href = 'index.html';
            } catch (error) {
                console.error("Çıkış hatası:", error);
            }
        }
    });
}