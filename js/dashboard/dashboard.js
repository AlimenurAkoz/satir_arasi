import { auth, db } from '../firebase/firebaseConfig.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENT SEÇİCİLER ---
    const headerUsername = document.getElementById('headerUsername');
    const headerAvatar = document.getElementById('headerAvatar');
    const navUserProfile = document.getElementById('navUserProfile');
    const navLoginBtn = document.getElementById('navLoginBtn');
    const welcomeNameSpan = document.querySelector('.user-name-span');
    const logoutBtn = document.getElementById('logoutBtn');

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const userRef = doc(db, "users", user.uid);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    const data = userSnap.data();
                    const userName = data.username; // Firestore'daki alan adı 'username' olmalı

                    if (headerUsername) headerUsername.innerText = userName;

                    const welcomeSpan = document.querySelector('.user-name-span');
                    if (welcomeSpan) {
                        welcomeSpan.innerText = userName;
                    }

                    if (headerAvatar) {
                        headerAvatar.src = data.photoURL || 'assets/img/default-avatar.png';
                    }
                }
            } catch (e) {
                console.error("İsim yüklenirken hata:", e);
            }
        } else {
            window.location.href = 'login.html';
        }
    });

    // Dropdown menü işlemleri
    const profileDropdown = document.querySelector('.user-profile-dropdown');
    const dropdownMenu = document.querySelector('.dropdown-menu');

    if (profileDropdown && dropdownMenu) {
        let timeout;
        profileDropdown.addEventListener('mouseenter', () => {
            clearTimeout(timeout);
            dropdownMenu.style.opacity = '1';
            dropdownMenu.style.visibility = 'visible';
            dropdownMenu.style.transform = 'translateY(0)';
        });

        profileDropdown.addEventListener('mouseleave', () => {
            timeout = setTimeout(() => {
                dropdownMenu.style.opacity = '0';
                dropdownMenu.style.visibility = 'hidden';
                dropdownMenu.style.transform = 'translateY(10px)';
            }, 300);
        });

        dropdownMenu.addEventListener('mouseenter', () => clearTimeout(timeout));
    }
});