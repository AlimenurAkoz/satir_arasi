import { auth, db } from '../firebase/firebaseConfig.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    let allBooks = [];
    const headerUsername = document.getElementById('headerUsername');
    const headerAvatar = document.getElementById('headerAvatar');
    const navUserProfile = document.getElementById('navUserProfile');
    const navLoginBtn = document.getElementById('navLoginBtn');
    const welcomeNameSpan = document.querySelector('.user-name-span');
    const logoutBtn = document.getElementById('logoutBtn');

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            let hedef = 0;
            let okunan = 0;
            const currentYear = new Date().getFullYear().toString();
            try {
                //  Kullanıcının kendi dokümanından hedefi çek
                const userRef = doc(db, "users", user.uid);
                const userSnap = await getDoc(userRef);

                
                if (userSnap.exists()) {
                    const data = userSnap.data();
                    if (welcomeNameSpan) welcomeNameSpan.innerText = data.username || "Okur";

                    //  HEDEFİ LOCALSTORAGE'DAN AL 
                    const userGoals = JSON.parse(localStorage.getItem('myUserGoals')) || { "2026": 8, "2025": 12, "2024": 15 };
                    const currentYear = new Date().getFullYear().toString();
                    hedef = userGoals[currentYear] || 8;


                    //  Okunan Kitap Sayısını Canlı Say (Koleksiyondan sayıyoruz)
                    // "Okuduklarım" etiketine sahip kaç kitap varsa hepsini getirir
                    const libraryRef = collection(db, "users", user.uid, "kullaniciKitapligi");
                    const qRead = query(libraryRef, where("status", "==", "Okuduklarım"));
                    const readSnap = await getDocs(qRead);
                    
                    
                    readSnap.forEach(doc => {
                        const d = doc.data();
                        if(d.readYear === currentYear || (!d.readYear && currentYear === "2026")) {
                            okunan++;
                        }
                    });

                    // 3. Arayüzü ve Çemberi Güncelle
                    updateReadingGoal(okunan, hedef);


                    fetchCurrentBooks(user.uid);

                    
                    // Hoş geldin mesajı vs...

                    if (welcomeNameSpan) welcomeNameSpan.innerText = data.username || "Okur";
                    
                    // readingGoals nesnesi varsa 2026'yı al, yoksa 0 ata
                    hedef = data.readingGoals?.["2026"] || 0;
                }

                //  sadece bu yıl okunanları say
                const libraryRef = collection(db, "users", user.uid, "kullaniciKitapligi");
                const qRead = query(libraryRef, where("status", "==", "Okuduklarım"));
                const readSnap = await getDocs(qRead);

                // readSnap.size, sorgu sonucundaki kitap sayısını verir
                okunan = readSnap.size;

                // Arayüzü güncelle
                updateReadingGoal(okunan, hedef);

                // Mevcut kitapları getir
                fetchCurrentBooks(user.uid);

            } catch (e) {
                console.error("Dashboard veri hatası:", e);
            }
        } else {
            window.location.href = 'login.html';
        }
    });

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

    async function fetchCurrentBooks(userId) {
        const container = document.getElementById('current-books-container');
        if (!container) return;

        try {
            const q = query(
                collection(db, "users", userId, "kullaniciKitapligi"),
                where("status", "==", "Okunuyor")
            );

            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                container.innerHTML = `
                <div style="text-align:center; padding:20px; color:#666;">
                    <p>Şu an aktif bir okumanız bulunmuyor.</p>
                    <a href="library.html" style="color:#4a6b6f; font-size:0.9rem;">Kitap eklemek için tıkla</a>
                </div>`;
                return;
            }

            const books = [];
            querySnapshot.forEach((doc) => books.push({ id: doc.id, ...doc.data() }));

            container.innerHTML = books.map(book => {
                const progress = book.progress || Math.round(((book.currentPage || 0) / (book.totalPages || 1)) * 100);
                return `
            <div class="book-item" onclick="window.location.href='book-detail.html?id=${book.id}'" style="cursor: pointer;">
                <img src="${book.cover || 'img/default-book.jpg'}" alt="${book.title}">
                <div class="book-info">
                    <h4>${book.title}</h4>
                    <p>${book.author}</p>
                    <div class="progress-bar"><span style="width: ${progress}%;"></span></div>
                    <span>%${progress} tamamlandı</span>
                </div>
            </div>`;
            }).join('');
        } catch (error) {
            console.error("Dashboard kitap yükleme hatası:", error);
            container.innerHTML = '<p>Veriler yüklenirken bir hata oluştu.</p>';
        }
    }

    const searchInput = document.getElementById('searchInput');
    const suggestionsPanel = document.getElementById('searchSuggestions');

    if (searchInput && suggestionsPanel) {
        searchInput.addEventListener('input', async (e) => {
            const term = e.target.value.toLowerCase().trim();
            if (term.length < 2) {
                suggestionsPanel.style.display = 'none';
                return;
            }
            try {
                const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=intitle:${term}&printType=books&orderBy=relevance&langRestrict=tr&maxResults=8`);
                const data = await response.json();
                renderSearchSuggestions(data.items || []);
            } catch (error) { console.error("Arama hatası:", error); }
        });
    }

    function renderSearchSuggestions(books) {
        if (books.length === 0) {
            suggestionsPanel.innerHTML = '<div style="padding:15px; font-size:0.9rem; color: #666;">Sonuç bulunamadı.</div>';
        } else {
            suggestionsPanel.innerHTML = books.map(item => `
            <div class="suggestion-item" onclick="window.location.href='book-detail.html?id=${item.id}'">
                <img src="${item.volumeInfo.imageLinks?.thumbnail || 'img/default-book.jpg'}" alt="">
                <div class="suggestion-info">
                    <h5>${item.volumeInfo.title}</h5>
                    <p>${item.volumeInfo.authors?.join(', ') || 'Bilinmeyen Yazar'}</p>
                </div>
            </div>`).join('');
        }
        suggestionsPanel.style.display = 'block';
    }

    document.addEventListener('click', (e) => {
        if (suggestionsPanel && !e.target.closest('.search-container')) suggestionsPanel.style.display = 'none';
    });

    const recContainer = document.getElementById('rec-container');
    const showMoreBtn = document.getElementById('show-more-btn');

    async function fetchRecommendations() {
        if (!recContainer) return;
        recContainer.innerHTML = '<p style="text-align:center; padding:20px;">Öneriler yükleniyor...</p>';
        try {
            const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=subject:fiction+modern+edebiyat+roman&printType=books&orderBy=relevance&langRestrict=tr&maxResults=40`);
            const data = await response.json();
            const forbiddenKeywords = ['yıllığı', 'ansiklopedisi', 'sözlüğü', 'araştırmaları', 'dergisi', 'fakültesi', 'eğitim', 'ders', 'tez', 'makale', 'sempozyum', 'tarihi', 'rehberi', 'kılavuzu', 'incelemesi', 'üzerine', 'rapor'];

            const literaryBooks = (data.items || []).filter(item => {
                const title = item.volumeInfo.title?.toLowerCase() || "";
                return item.volumeInfo.imageLinks?.thumbnail && !forbiddenKeywords.some(word => title.includes(word));
            });

            console.log("API'den gelen toplam kitap sayısı:", data.items?.length);
            console.log("Filtrelemeden sonra kalan kitap sayısı:", literaryBooks.length);

            const selected = literaryBooks.sort(() => 0.5 - Math.random()).slice(0, 6);
            renderRecommendations(selected);
        } catch (error) { console.error("Öneriler çekilemedi:", error); }
    }

    function renderRecommendations(books) {
        if (!recContainer) return;
        recContainer.innerHTML = books.map(item => {
            const info = item.volumeInfo;
            const safeTitle = info.title.replace(/"/g, '&quot;');
            const safeAuthor = (info.authors?.join(', ') || 'Bilinmeyen Yazar').replace(/"/g, '&quot;');
            return `
            <div class="recommendation-item" onclick="location.href='book-detail.html?id=${item.id}'" style="cursor: pointer;">
                <img src="${info.imageLinks?.thumbnail || 'img/default-book.jpg'}" alt="${safeTitle}">
                <div class="rec-info">
                    <h4>${safeTitle}</h4>
                    <p>${safeAuthor}</p>
                    <div class="tags"><span>${info.categories?.[0] || 'Genel'}</span></div>
                </div>
            </div>`;
        }).join('');
    }

    // --- HEDEF ÇEMBERİNİ GÜNCELLEME VE KESKİN BOYAMA ---
    function updateReadingGoal(read, total) {
        // total 0 veya boşsa, hedefi 0 kabul et
        const safeTotal = total || 0;

        // Sıfıra bölünmeyi engellemek için basit kontrol
        let percent = 0;
        if (safeTotal > 0) {
            percent = Math.round((read / safeTotal) * 100);
        }

        const safePercent = percent > 100 ? 100 : percent;
        const degree = (safePercent / 100) * 360;

        // Arayüz elemanlarını seç
        const targetPercentEl = document.getElementById('target-percent');
        const booksReadEl = document.getElementById('books-read');
        const totalTargetEl = document.getElementById('total-target');

        // Metin güncellemeleri
        if (targetPercentEl) targetPercentEl.innerText = `%${safePercent}`;
        if (booksReadEl) booksReadEl.innerText = read || 0; // Okunan kitap yoksa 0 yaz
        if (totalTargetEl) totalTargetEl.innerText = safeTotal; // Artık 0 görünecek

        // Çember güncellemesi
        const circularProgress = document.querySelector('.circular-progress');
        if (circularProgress) {
            if (safePercent === 0) {
                circularProgress.style.background = '#e0e0e0'; // Boş çember
            } else {
                circularProgress.style.background = `conic-gradient(#4a6b6f ${degree}deg, #e0e0e0 0deg)`;
            }
        }
    }


    if (showMoreBtn) showMoreBtn.addEventListener('click', fetchRecommendations);

    // Sayfa yüklendiğinde ilk tetikleyici
    fetchRecommendations();
});