import { doc, getDoc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { db, auth } from "../firebase/firebaseConfig.js";



// --- 1. URL'DEN ID ALMA VE TEMİZLEME ---
const urlParams = new URLSearchParams(window.location.search);
const currentBookId = urlParams.get('id') 
// Global değişkenler
let currentRating = 0;


if (!currentBookId) {
    // ID yoksa kullanıcıyı arama sayfasına geri gönder veya bir uyarı ver
    console.error("Kitap ID'si bulunamadı!");
}


// --- 2. GOOGLE BOOKS API'DEN KİTAP ÇEK ---
async function fetchBookFromAPI() {
    if (!currentBookId) {
        console.warn("URL'de kitap ID'si bulunamadı.");
        const container = document.querySelector('.book-detail-container');
        if (container) {
            container.innerHTML = `
                <div style="text-align:center; padding:50px; width:100%;">
                    <i class="fa-solid fa-circle-exclamation" style="font-size:3.5rem; color:#4a6b6f; margin-bottom:20px;"></i>
                    <h2 style="color: #2c3e50;">Geçersiz Kitap Seçimi</h2>
                    <p style="color: #666;">Lütfen kütüphaneden veya aramadan bir kitap seçerek detayları görüntüleyin.</p>
                    <a href="library.html" class="btn-primary" style="text-decoration:none; display:inline-block; margin-top:20px; padding: 12px 25px;">Kitap Keşfet</a>
                </div>`;
        }
        return;
    }

    try {
        const apiUrl = `https://www.googleapis.com/books/v1/volumes/${currentBookId}`;
        const response = await fetch(apiUrl);
        if (!response.ok) return;

        const data = await response.json();
        const info = data.volumeInfo;
        if (!info) return;

        let coverImg = 'img/default-book.jpg';
        if (info.imageLinks) {
            coverImg = (info.imageLinks.medium || info.imageLinks.large || info.imageLinks.thumbnail).replace('http:', 'https:');
        }

        if (document.getElementById('bookCover')) document.getElementById('bookCover').src = coverImg;
        if (document.getElementById('bookTitle')) document.getElementById('bookTitle').innerText = info.title || "İsimsiz Kitap";
        if (document.getElementById('bookAuthor')) document.getElementById('bookAuthor').innerText = info.authors ? info.authors.join(', ') : "Bilinmeyen Yazar";
        if (document.getElementById('bookDescription')) document.getElementById('bookDescription').innerHTML = info.description || "Özet bulunmuyor.";
        
        const totalPagesInput = document.getElementById('totalPages');
        if(totalPagesInput && info.pageCount) totalPagesInput.value = info.pageCount;
    } catch (error) { console.error("API Hatası:", error); }
}

fetchBookFromAPI();

// --- 3. KULLANICI DURUMU VE FIREBASE ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        if (currentBookId) {
            initializeInteractiveFeatures(user);
        }
    } else {
        if (authRequiredStatus) authRequiredStatus.style.display = 'none';
        if (reviewSection) {
            reviewSection.innerHTML = `<p style="text-align:center; padding:20px;">Lütfen not almak için giriş yapın.</p>`;
        }
    }
});

async function initializeInteractiveFeatures(user) {
    const stars = document.querySelectorAll('#starRating span');
    const statusSelect = document.getElementById('readingStatus');
    const userNote = document.getElementById('userNote');
    const saveButton = document.getElementById('saveReviewBtn');
    const deleteBtn = document.getElementById('deleteBookBtn'); 
    const pageTracker = document.getElementById('pageTracker');
    const currentPageInput = document.getElementById('currentPage');
    const totalPagesInput = document.getElementById('totalPages');
    
    let currentRating = 0; 
    const bookRef = doc(db, "users", user.uid, "kullaniciKitapligi", currentBookId);

    // --- FIREBASE'DEN MEVCUT VERİYİ ÇEK ---
    try {
        const bookSnap = await getDoc(bookRef);
        if (bookSnap.exists()) {
            const data = bookSnap.data();
            if (statusSelect) statusSelect.value = data.status === "Okunuyor" ? "okunuyor" : (data.status === "Okuduklarım" ? "okudum" : "okunacak");
            if (currentPageInput) currentPageInput.value = data.currentPage || '';
            if (totalPagesInput) totalPagesInput.value = data.totalPages || '';
            if (userNote) userNote.value = data.note || '';
            currentRating = data.rating || 0;
            
            stars.forEach((s, i) => s.style.filter = (i < currentRating) ? "grayscale(0%)" : "grayscale(100%)");
            if (deleteBtn) deleteBtn.style.display = 'inline-block';
        }
    } catch (e) { console.error("Firebase Veri Çekme Hatası:", e); }

    // --- 4. PUANLAMA VE GÖRÜNÜRLÜK DENETİMİ ---
    function checkRatingStatus() {
    const starRatingDiv = document.getElementById('starRating');
    const stars = document.querySelectorAll('#starRating span');
    
    if (statusSelect.value === "okudum") {
        if (starRatingDiv) { 
            starRatingDiv.style.opacity = "1"; 
            starRatingDiv.style.pointerEvents = "auto"; 
        }
        if (pageTracker) pageTracker.style.display = "block";
        if (totalPagesInput.value) currentPageInput.value = totalPagesInput.value;

        // ---  Eğer henüz puan verilmemişse (rating 0 ise) yıldızları renksiz yap ---
        if (currentRating === 0) {
            stars.forEach(s => s.style.filter = "grayscale(100%)");
        } else {
            // Eğer veritabanından gelen bir puan varsa onu göster
            stars.forEach((s, i) => s.style.filter = (i < currentRating) ? "grayscale(0%)" : "grayscale(100%)");
        }
    } else {
        // Okunuyor veya Okunacaklar seçiliyse yıldızları pasif yap ve grileştir
        if (starRatingDiv) { 
            starRatingDiv.style.opacity = "0.4"; 
            starRatingDiv.style.pointerEvents = "none"; 
        }
        stars.forEach(s => s.style.filter = "grayscale(100%)");
        
        if (statusSelect.value === "okunuyor") {
            if (pageTracker) pageTracker.style.display = "block";
        } else {
            if (pageTracker) pageTracker.style.display = "none";
        }
    }
}

    // --- 5. OKUMA İLERLEMESİ ANLIK DENETİM & OTOMATİK DURUM ---
    if (currentPageInput && totalPagesInput) {
        currentPageInput.addEventListener('input', () => {
            const curr = parseInt(currentPageInput.value) || 0;
            const total = parseInt(totalPagesInput.value) || 0;

            // Hata Kontrolü (Kırmızı çerçeve)
            if (curr > total) {
                currentPageInput.style.borderColor = "#ff4d4d";
                currentPageInput.style.backgroundColor = "rgba(255, 77, 77, 0.1)";
            } else {
                currentPageInput.style.borderColor = "rgba(74, 107, 111, 0.2)";
                currentPageInput.style.backgroundColor = "white";

                // OTOMATİK DURUM GEÇİŞİ: Sayfalar eşitlendiyse
                if (curr > 0 && curr === total) {
                    statusSelect.value = "okudum";
                    checkRatingStatus(); // Puanlamayı anında açar
                }
            }
        });
    }

    if(statusSelect) statusSelect.addEventListener('change', checkRatingStatus);
    checkRatingStatus();

    stars.forEach((star, index) => {
        star.addEventListener('click', () => {
            currentRating = index + 1; 
            stars.forEach((s, i) => s.style.filter = (i < currentRating) ? "grayscale(0%)" : "grayscale(100%)");
        });
    });

    // --- SİLME (DELETE) ---
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            if(confirm("Bu kitabı kütüphanenizden silmek istediğinize emin misiniz?")) {
                try {
                    await deleteDoc(bookRef);
                    alert("Kitap kütüphanenizden kaldırıldı.");
                    window.location.href = "my-library.html";
                } catch (e) { console.error("Silme Hatası:", e); }
            }
        });
    }

    // --- KAYDETME (CREATE/UPDATE) ---
if (saveButton) {
    saveButton.addEventListener('click', async () => {
        const currentPage = parseInt(currentPageInput.value) || 0;
        const totalPages = parseInt(totalPagesInput.value) || 0;
        const selectedValue = statusSelect.value; // "okunuyor", "okudum" veya "okunacak"

        // 1. Mantıksal Denetim
        if (currentPage > totalPages) {
            alert(`Hata: Kalınan sayfa sayısı (${currentPage}), kitabın toplam sayfa sayısından (${totalPages}) fazla olamaz!`);
            return; 
        }

        // 2. Puan Kontrolü
        if (selectedValue === "okudum" && currentRating === 0) {
            alert("Lütfen bitirdiğiniz kitap için bir puan seçin.");
            return;
        }

        // 3. İSİMLENDİRME STANDARTLAŞTIRMA 
        let libraryStatus = "Okunacaklar"; // varsayılan
        if (selectedValue === "okunuyor") {
            libraryStatus = "Okunuyor";
        } else if (selectedValue === "okudum") {
            libraryStatus = "Okuduklarım";
        }

        try {
            saveButton.innerText = "Kaydediliyor...";
            saveButton.disabled = true;

            await setDoc(bookRef, {
                userId: user.uid,
                id: currentBookId,
                title: document.getElementById('bookTitle').innerText,
                author: document.getElementById('bookAuthor').innerText,
                cover: document.getElementById('bookCover').src,
                status: libraryStatus, 
                rating: currentRating,
                note: userNote.value,
                currentPage: currentPage,
                totalPages: totalPages,
                readYear: new Date().getFullYear().toString(),
                updatedAt: new Date() // Sıralama için eklendi
            }, { merge: true });

            alert("Değişiklikler kaydedildi!");
            window.location.href = "my-library.html"; 
        } catch (error) {
            console.error("Kayıt Hatası:", error);
            alert("Kaydedilemedi, lütfen tekrar deneyin.");
            saveButton.innerText = "Kaydet";
            saveButton.disabled = false;
        }
    });
}
}