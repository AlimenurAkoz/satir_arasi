import { doc, getDoc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { db, auth } from "../firebase/firebaseConfig.js";

// --- 1. URL'DEN ID ALMA VE TEMİZLEME ---
const urlParams = new URLSearchParams(window.location.search);
const currentBookId = urlParams.get('id'); 
let currentRating = 0;

if (!currentBookId) {
    console.error("Kitap ID'si bulunamadı!");
}

// --- 2. OPEN LIBRARY API'DEN KİTAP ÇEK (YENİLENDİ) ---
async function fetchBookFromAPI() {
    if (!currentBookId) {
        const container = document.querySelector('.book-detail-container');
        if (container) {
            container.innerHTML = `
                <div style="text-align:center; padding:50px; width:100%;">
                    <i class="fa-solid fa-circle-exclamation" style="font-size:3.5rem; color:#4a6b6f; margin-bottom:20px;"></i>
                    <h2 style="color: #2c3e50;">Geçersiz Kitap Seçimi</h2>
                    <p style="color: #666;">Lütfen kütüphaneden veya aramadan bir kitap seçin.</p>
                    <a href="library.html" class="btn-primary" style="text-decoration:none; display:inline-block; margin-top:20px; padding: 12px 25px;">Kitap Keşfet</a>
                </div>`;
        }
        return;
    }

    try {
        const apiUrl = `https://openlibrary.org/works/${currentBookId}.json`;
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error("Kitap detayları alınamadı.");

        const data = await response.json();
        
        // Kapak Resmi Çözümü
        let coverImg = 'img/default-book.jpg';
        if (data.covers && data.covers.length > 0) {
            coverImg = `https://covers.openlibrary.org/b/id/${data.covers[0]}-L.jpg`;
        }

        // Başlık ve Açıklama
        const title = data.title || "İsimsiz Kitap";
        let description = "Özet bulunmuyor.";
        if (data.description) {
            description = typeof data.description === 'object' ? data.description.value : data.description;
        }

        // Yazar Bilgisini Çekme (Köprü İstek)
        let authorText = "Bilinmeyen Yazar";
        if (data.authors && data.authors.length > 0) {
            const authorKey = data.authors[0].author?.key || data.authors[0].key;
            if (authorKey) {
                try {
                    const authRes = await fetch(`https://openlibrary.org${authorKey}.json`);
                    if (authRes.ok) {
                        const authData = await authRes.json();
                        authorText = authData.name || "Bilinmeyen Yazar";
                    }
                } catch (e) { console.error("Yazar adı API'den alınamadı:", e); }
            }
        }
        
        if (document.getElementById('bookCover')) document.getElementById('bookCover').src = coverImg;
        if (document.getElementById('bookTitle')) document.getElementById('bookTitle').innerText = title;
        if (document.getElementById('bookAuthor')) document.getElementById('bookAuthor').innerText = authorText;
        if (document.getElementById('bookDescription')) document.getElementById('bookDescription').innerHTML = description;
        
    } catch (error) { 
        console.error("API Hatası:", error);
    }
}

fetchBookFromAPI();

// --- 3. KULLANICI DURUMU VE FIREBASE ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        if (currentBookId) {
            initializeInteractiveFeatures(user);
        }
    } else {
        const reviewSection = document.getElementById('reviewSection');
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
    
    const bookRef = doc(db, "users", user.uid, "kullaniciKitapligi", currentBookId);

    // --- FIREBASE'DEN MEVCUT VERİYİ ÇEK ---
    try {
        const bookSnap = await getDoc(bookRef);
        if (bookSnap.exists()) {
            const data = bookSnap.data();
            
            if (document.getElementById('bookAuthor') && data.author) {
                document.getElementById('bookAuthor').innerText = data.author;
            }

            if (statusSelect) statusSelect.value = data.status === "Okunuyor" ? "okunuyor" : (data.status === "Okuduklarım" ? "okudum" : "okunacak");
            if (currentPageInput) currentPageInput.value = data.currentPage || '';
            if (totalPagesInput) totalPagesInput.value = data.totalPages || '';
            if (userNote) userNote.value = data.note || '';
            currentRating = data.rating || 0;
            
            stars.forEach((s, i) => s.style.filter = (i < currentRating) ? "grayscale(0%)" : "grayscale(100%)");
            if (deleteBtn) deleteBtn.style.display = 'inline-block';
        }
    } catch (e) { console.error("Firebase Veri Çekme Hatası:", e); }

    function checkRatingStatus() {
        const starRatingDiv = document.getElementById('starRating');
        const stars = document.querySelectorAll('#starRating span');
        
        if (statusSelect.value === "okudum") {
            if (starRatingDiv) { 
                starRatingDiv.style.opacity = "1"; 
                starRatingDiv.style.pointerEvents = "auto"; 
            }
            if (pageTracker) pageTracker.style.display = "block";
            
            // --- OTOMATİK SAYFA EŞİTLEME KONTROLÜ ---
            if (totalPagesInput.value && parseInt(totalPagesInput.value) > 0) {
                currentPageInput.value = totalPagesInput.value;
            }

            if (currentRating === 0) {
                stars.forEach(s => s.style.filter = "grayscale(100%)");
            } else {
                stars.forEach((s, i) => s.style.filter = (i < currentRating) ? "grayscale(0%)" : "grayscale(100%)");
            }
        } else {
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

    if (currentPageInput && totalPagesInput) {
        currentPageInput.addEventListener('input', () => {
            const curr = parseInt(currentPageInput.value) || 0;
            const total = parseInt(totalPagesInput.value) || 0;

            if (curr > total) {
                currentPageInput.style.borderColor = "#ff4d4d";
                currentPageInput.style.backgroundColor = "rgba(255, 77, 77, 0.1)";
            } else {
                currentPageInput.style.borderColor = "rgba(74, 107, 111, 0.2)";
                currentPageInput.style.backgroundColor = "white";

                if (curr > 0 && curr === total) {
                    statusSelect.value = "okudum";
                    checkRatingStatus();
                }
            }
        });
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            if (confirm("Bu kitabı kütüphanenizden silmek istediğinize emin misiniz?")) {
                try {
                    await deleteDoc(bookRef);
                    alert("Kitap kütüphanenizden kaldırıldı.");
                    window.location.href = "my-library.html";
                } catch (e) { console.error("Silme Hatası:", e); }
            }
        });
    }

    if (saveButton) {
        saveButton.addEventListener('click', async () => {
            const currentPage = parseInt(currentPageInput.value) || 0;
            const totalPages = parseInt(totalPagesInput.value) || 0;
            const selectedValue = statusSelect.value;

            if (currentPage > totalPages) {
                alert(`Hata: Sayfa sayısı sınırı aşıldı!`);
                return; 
            }

            // --- MANDATORY PUAN DOĞRULAMA KONTROLÜ ---
            if (selectedValue === "okudum" && currentRating === 0) {
                alert("Lütfen bitirdiğiniz kitap için bir puan (yıldız) seçin.");
                return; 
            }

            let libraryStatus = "Okunacaklar";
            if (selectedValue === "okunuyor") libraryStatus = "Okunuyor";
            else if (selectedValue === "okudum") libraryStatus = "Okuduklarım";

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
                    updatedAt: new Date()
                }, { merge: true });

                alert("Değişiklikler kaydedildi!");
                window.location.href = "my-library.html"; 
            } catch (error) {
                console.error("Kayıt Hatası:", error);
                saveButton.innerText = "Kaydet";
                saveButton.disabled = false;
            }
        });
    }

    // --- YILDIZ TIKLAMA VE DINAMIK ERİŞİLEBİLİRLİK SÖYLEMİ ---
    stars.forEach((star, index) => {
        star.addEventListener('click', () => {
            currentRating = index + 1; 
            stars.forEach((s, i) => {
                s.style.filter = (i < currentRating) ? "grayscale(0%)" : "grayscale(100%)";
                
                if (i === index) {
                    s.setAttribute('aria-label', `${i + 1} yıldız, seçildi`);
                } else {
                    s.setAttribute('aria-label', `${i + 1} yıldız`);
                }
            });
        });
    });

    if (statusSelect) statusSelect.addEventListener('change', checkRatingStatus);
    checkRatingStatus();
}