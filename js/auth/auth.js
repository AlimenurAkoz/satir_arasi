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
    const path = window.location.pathname;
    const page = path.split("/").pop() || "index.html";
    
    if (user) {
        // Navbar düzenleme
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
                if (headerAvatar) headerAvatar.src = data.photoURL || 'default-avatar.png';
            }
        } catch (e) {
            console.error("Firestore verisi çekilirken hata:", e);
        }

    } else {
        // Giriş yapılmamışsa
        if (navLoginBtn) navLoginBtn.style.display = 'block';
        if (navUserProfile) navUserProfile.style.display = 'none';
        
        const protectedPages = ['library.html', 'profile.html', 'book-detail.html', 'stats.html'];
        if (protectedPages.includes(page)) {
            window.location.href = 'login.html';
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
            window.location.href = 'index.html';
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

        if (!profileFile) return alert("Lütfen bir profil fotoğrafı seçin.");

        try {
            submitBtn.innerText = "Hesap Oluşturuluyor...";
            submitBtn.disabled = true;

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            const photoBase64 = await toBase64(profileFile);

            await updateProfile(user, { displayName: username });

            await setDoc(doc(db, "users", user.uid), {
                username: username,
                photoURL: photoBase64,
                email: email,
                createdAt: new Date()
            });

            window.location.href = 'index.html';
        } catch (error) {
            submitBtn.innerText = "Kayıt Ol";
            submitBtn.disabled = false;
            console.error("Kayıt hatası:", error);
            alert("Hata: " + error.message);
        }
    });
}

// Çıkış yapma işlemi
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        if (confirm("Çıkış yapmak istediğinize emin misiniz?")) {
            try {
                await signOut(auth);
                window.location.href = 'login.html';
            } catch (error) {
                console.error("Çıkış hatası:", error);
            }
        }
    });
}