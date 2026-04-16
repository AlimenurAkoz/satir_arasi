import { auth, db } from '../firebase/firebaseConfig.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENT SEÇİCİLER ---
    let allBooks = []; // API'den gelen kitapları burada saklayacağız
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

    // --- KİTAP ÇEKME VE LİSTELEME İŞLEMLERİ ---

    // 1. Firebase'den Okunan Kitapları Getir
    async function fetchCurrentBooks(userId) {
        const container = document.getElementById('current-books-container');
        // Burada Firebase koleksiyon yapınıza göre (örn: 'userBooks') çekim yapılır
        // Şimdilik arkadaşının API yapısına uygun bir render hazırlayalım:

        /* Örnek veri yapısı geldiğinde çalışacak fonksiyon */
        window.renderCurrentBooks = (books) => {
            container.innerHTML = books.map(book => `
            <div class="book-item" onclick="window.location.href='book-detail.html?id=${book.id}'" style="cursor: pointer;">
                <img src="${book.cover}" alt="${book.title}">
                <div class="book-info">
                    <h4>${book.title}</h4>
                    <p>${book.author}</p>
                    <div class="progress-bar"><span style="width: ${book.progress}%;"></span></div>
                    <span>%${book.progress} tamamlandı</span>
                    <button class="btn-continue" onclick="window.location.href='book-detail.html?id=${book.id}'">Devam Et</button>
                </div>
            </div>
        `).join('');
        };
    }

    // --- CANLI ARAMA SİHRİ ---
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
                // 'intitle:' operatörü kelimenin mutlaka kitap isminde geçmesini sağlar
                const searchQuery = `intitle:${term}`;
                // Arama yaparken 'intitle' kullanmak akademik makaleleri eler, doğrudan isme odaklanır
                const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=intitle:${term}+subject:fiction&printType=books&orderBy=relevance&langRestrict=tr&maxResults=8`);

                const data = await response.json();
                const results = data.items || [];
                renderSearchSuggestions(results);
            } catch (error) {
                console.error("Arama hatası:", error);
            }
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
            </div>
        `).join('');
        }
        suggestionsPanel.style.display = 'block';
    }

    // Panel dışına tıklayınca kapat
    document.addEventListener('click', (e) => {
        if (suggestionsPanel && !e.target.closest('.search-container')) {
            suggestionsPanel.style.display = 'none';
        }
    });

    // 2. Harici API'den Rastgele Öneriler Getir (6 Kitap)
    // --- KİTAP ÇEKME VE LİSTELEME İŞLEMLERİ ---

    // 2. Harici API'den Rastgele Öneriler Getir
    const recContainer = document.getElementById('rec-container');
    const showMoreBtn = document.getElementById('show-more-btn');

    async function fetchRecommendations() {
        if (!recContainer) return;

        try {
            // 'subject:fiction' Google'a sadece kurgu (roman, öykü vb.) istediğimizi söyler.
            // Yanına 'modern' ve 'edebiyat' ekleyerek popülerliği tetikliyoruz.
            const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=subject:fiction+modern+edebiyat+roman&printType=books&orderBy=relevance&langRestrict=tr&maxResults=40`);
            const data = await response.json();
            let items = data.items || [];

            // ELİT FİLTRELEME: Edebiyat dışı her şeyi ayıklıyoruz
            const forbiddenKeywords = [
                'yıllığı', 'ansiklopedisi', 'sözlüğü', 'araştırmaları', 'dergisi',
                'fakültesi', 'eğitim', 'ders', 'tez', 'makale', 'sempozyum',
                'tarihi', 'rehberi', 'kılavuzu', 'incelemesi', 'üzerine', 'rapor'
            ];

            const literaryBooks = items.filter(item => {
                const title = item.volumeInfo.title?.toLowerCase() || "";
                const hasCover = item.volumeInfo.imageLinks?.thumbnail;

                // Başlığında yukarıdaki "sıkıcı" kelimelerden biri bile geçiyorsa alma
                const isNonFiction = forbiddenKeywords.some(word => title.includes(word));

                // Sadece kapak resmi olan ve edebi türde olduğunu düşündüğümüz kitaplar
                return hasCover && !isNonFiction;
            });

            // 1000Kitap gibi her seferinde farklı popüler kitaplar gelsin
            const selected = literaryBooks.sort(() => 0.5 - Math.random()).slice(0, 6);

            renderRecommendations(selected);
        } catch (error) {
            console.error("Öneriler çekilemedi:", error);
        }
    }
    function renderRecommendations(books) {
        if (!recContainer) return;

        recContainer.innerHTML = books.map(item => {
            const info = item.volumeInfo;
            const bookId = item.id;

            const coverImg = info.imageLinks?.thumbnail || 'img/default-book.jpg';

            // Tıklanma sorununu çözmek için: Tırnak işaretlerini temizlemek yerine 
            // HTML attribute içinde sorun yaratmayacak şekilde encode ediyoruz.
            const safeTitle = info.title.replace(/"/g, '&quot;');
            const safeAuthor = (info.authors?.join(', ') || 'Bilinmeyen Yazar').replace(/"/g, '&quot;');

            return `
            <div class="recommendation-item" 
                 onclick="location.href='book-detail.html?id=${bookId}'" 
                 style="cursor: pointer;">
                <img src="${coverImg}" alt="${safeTitle}">
                <div class="rec-info">
                    <h4>${safeTitle}</h4>
                    <p>${safeAuthor}</p>
                    <div class="tags">
                        <span>${info.categories?.[0] || 'Genel'}</span>
                    </div>
                </div>
            </div>
        `;
        }).join('');
    }

    function updateReadingGoal(read, total) {
        const percent = Math.round((read / total) * 100);
        const degree = (percent / 100) * 360;

        // Yüzde metnini güncelle
        const targetPercentEl = document.getElementById('target-percent');
        if (targetPercentEl) targetPercentEl.innerText = `${percent}%`;

        // Alt metni güncelle (opsiyonel, statik değilse)
        const booksReadEl = document.getElementById('books-read');
        const totalTargetEl = document.getElementById('total-target');
        if (booksReadEl) booksReadEl.innerText = read;
        if (totalTargetEl) totalTargetEl.innerText = total;

        // Koyu rengi (ilerlemeyi) daireye uygula
        const circularProgress = document.querySelector('.circular-progress');
        if (circularProgress) {
            // #4a6b6f görseldeki koyu yeşil tonu
            circularProgress.style.background = `conic-gradient(#4a6b6f ${degree}deg, rgba(0,0,0,0.1) 0deg)`;
        }
    }

    // Örnek kullanım (Firebase'den veriler gelince burayı çağırabilirsin)
    updateReadingGoal(8, 50);

    // "Daha Fazla Göster" Butonu Olayı
    if (showMoreBtn) {
        showMoreBtn.addEventListener('click', fetchRecommendations);
    }

    // Sayfa yüklendiğinde önerileri getir
    fetchRecommendations();
});