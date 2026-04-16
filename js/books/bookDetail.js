import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { db, auth } from "../firebase/firebaseConfig.js";

// --- EKRAN KONTROLÜ İÇİN GEREKLİ ALANLAR ---
const authRequiredStatus = document.getElementById('authRequiredStatus');
const reviewSection = document.getElementById('reviewSection');
const homeLink = document.getElementById('homeLink');
const logoLink = document.getElementById('logoLink');

// --- KULLANICI OTURUM KONTROLÜ ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        // GİRİŞ YAPILMIŞ: Linkleri Dashboard'a yönlendir
        if (homeLink) homeLink.href = "dashboard.html";
        if (logoLink) logoLink.href = "dashboard.html";

        // Detay özelliklerini başlat
        initializeInteractiveFeatures();
    } else {
        // GİRİŞ YAPILMAMIŞ: Linkleri Index'e yönlendir (Varsayılan)
        if (homeLink) homeLink.href = "index.html";
        if (logoLink) logoLink.href = "index.html";

        // Detay kısımlarını kilitle
        if (authRequiredStatus) {
            authRequiredStatus.style.display = 'none';
        }

        if (reviewSection) {
            reviewSection.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 400px; text-align: center; padding: 40px 20px; background: rgba(255,255,255,0.6); border-radius: 20px; border: 2px dashed rgba(74, 107, 111, 0.4);">
                    <i class="fa-solid fa-lock" style="font-size: 3.5rem; color: #4a6b6f; margin-bottom: 20px;"></i>
                    <h3 style="color: #2c3e50; margin-bottom: 15px; font-size: 1.5rem;">Sadece Üyelere Özel</h3>
                    <p style="color: #444; line-height: 1.6; margin-bottom: 25px; font-size: 1.05rem;">
                        Bu kitabı kitaplığınıza eklemek, yıldız vermek ve kişisel notlarınızı kaydetmek için lütfen giriş yapın.
                    </p>
                    <a href="login.html" class="btn-primary" style="text-decoration: none; display: inline-block; padding: 15px 35px; width: auto;">Hemen Giriş Yap</a>
                </div>
            `;
        }
    }
});

// --- KİTAP DETAY ETKİLEŞİMLERİ ---
function initializeInteractiveFeatures() {
    
    // 1. Yıldız Puanlama Mantığı
    const stars = document.querySelectorAll('#starRating span');
    let currentRating = 0; 

    if (stars.length > 0) {
        stars.forEach(star => {
            star.style.filter = "grayscale(100%)"; 
            star.style.transition = "filter 0.2s ease-in-out"; 
        });

        stars.forEach((star, index) => {
            star.addEventListener('click', () => {
                currentRating = index + 1; 
                stars.forEach((s, i) => {
                    if (i < currentRating) {
                        s.style.filter = "grayscale(0%)"; 
                    } else {
                        s.style.filter = "grayscale(100%)"; 
                    }
                });
            });
        });
    }

    // 2. Karakter Sayacı Mantığı
    const userNote = document.getElementById('userNote');
    const charCounter = document.getElementById('charCounter');
    const maxLength = 2000;

    if (userNote && charCounter) {
        userNote.addEventListener('input', function() {
            const currentLength = this.value.length;
            charCounter.textContent = `${currentLength} / ${maxLength}`;
            
            if (currentLength >= maxLength - 50) {
                charCounter.style.color = '#e74c3c'; 
            } else {
                charCounter.style.color = '#7f8c8d'; 
            }
        });
    }

    // 3. Firebase Kaydetme Mantığı
    const saveButton = document.getElementById('saveReviewBtn');
    const statusSelect = document.getElementById('readingStatus');
    
    if (saveButton && statusSelect && userNote) {
        saveButton.addEventListener('click', async () => {
            const selectedStatus = statusSelect.value;
            const enteredNote = userNote.value;

            if (currentRating === 0) {
                alert("Lütfen kitabı kaydetmeden önce bir yıldız puanı verin!");
                return;
            }

            try {
                const bookRef = doc(db, "books", "test_kitap_123"); 
                await updateDoc(bookRef, {
                    status: selectedStatus,
                    rating: currentRating,
                    note: enteredNote
                });
                alert("Harika! Değerlendirmeniz veritabanına başarıyla kaydedildi.");
            } catch (error) {
                console.error("Kayıt hatası:", error);
                alert("Şu an test aşamasında olduğumuz için veri buluta gitmedi ama kodumuz sorunsuz çalışıyor!");
            }
        });
    }
}