import { auth } from '../firebase/firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const popularBooksContainer = document.getElementById('popularBooksContainer');
    const navRight = document.querySelector('.nav-right');
    const ctaButton = document.querySelector('.cta-area .btn-primary');

    // --- 1. KULLANICI DURUMU KONTROLÜ ---
    onAuthStateChanged(auth, (user) => {
        if (user) {
            if (navRight) {
                navRight.innerHTML = `
                    <a href="dashboard.html" class="btn-login-nav">
                        <i class="fas fa-columns"></i> Paneli Gör
                    </a>
                `;
            }
            if (ctaButton) {
                ctaButton.innerText = "Okumaya Devam Et";
                ctaButton.href = "dashboard.html";
            }
        }
    });

    // --- 2. POPÜLER KİTAPLARI ÇEKME ---
    async function fetchPopularBooks() {
        if (!popularBooksContainer) return;

        try {
            // Türkiye'de popüler olan edebi türleri hedefleyen güçlü bir sorgu
            const query = 'subject:fiction+modern+edebiyat+roman';

            const response = await fetch(
                `https://www.googleapis.com/books/v1/volumes?q=${query}&orderBy=relevance&maxResults=20&langRestrict=tr&printType=books`
            );
            const data = await response.json();
            let items = data.items || [];

            // Filtreleme: Akademik, ders kitabı veya ansiklopedik içerikleri ayıklıyoruz
            const forbiddenKeywords = [
                'yıllığı', 'ansiklopedisi', 'sözlüğü', 'araştırmaları', 'eğitim',
                'ders', 'tez', 'makale', 'incelemesi', 'kılavuzu', 'rapor'
            ];

            const filteredBooks = items.filter(item => {
                const title = item.volumeInfo.title?.toLowerCase() || "";
                const hasCover = item.volumeInfo.imageLinks?.thumbnail;
                const isBoring = forbiddenKeywords.some(word => title.includes(word));

                return hasCover && !isBoring;
            });

            // Filtrelenmiş listeden rastgele 3 tanesini seç (her yenilemede değişmesi için)
            const selected = filteredBooks.sort(() => 0.5 - Math.random()).slice(0, 3);

            if (selected.length > 0) {
                renderPopularBooks(selected);
            } else {
                popularBooksContainer.innerHTML = '<p style="color:white;">Kitaplar şu an hazır değil.</p>';
            }
        } catch (error) {
            console.error("Popüler kitaplar çekilemedi:", error);
            popularBooksContainer.innerHTML = '<p style="color:white;">Bağlantı hatası.</p>';
        }
    }

    function renderPopularBooks(books) {
        // Kitapları yan yana basıyoruz
        popularBooksContainer.innerHTML = books.map(item => {
            const info = item.volumeInfo;
            const thumbnail = info.imageLinks?.thumbnail
                ? info.imageLinks.thumbnail.replace('http:', 'https:').replace('&zoom=1', '&zoom=2')
                : 'https://via.placeholder.com/180x270';
            const safeTitle = info.title.length > 35 ? info.title.substring(0, 35) + '...' : info.title;

            return `
                <div class="book-card" onclick="window.location.href='library.html?search=${encodeURIComponent(info.title)}'" style="cursor: pointer;">
                    <div class="book-img">
                        <img src="${thumbnail}" alt="${safeTitle}">
                    </div>
                    <h4 style="color:white; margin-top:15px; font-size:1rem; max-width:180px;">${safeTitle}</h4>
                </div>
            `;
        }).join('');
    }

    // --- 3. ARAMA MANTIĞI ---
    const mainSearchBtn = document.getElementById('mainSearchBtn');
    const mainSearchInput = document.getElementById('mainSearchInput');

    if (mainSearchBtn && mainSearchInput) {
        const handleSearch = () => {
            const query = mainSearchInput.value.trim();
            if (query !== "") {
                window.location.href = `library.html?search=${encodeURIComponent(query)}`;
            } else {
                alert("Lütfen bir kitap adı girin.");
            }
        };

        mainSearchBtn.addEventListener('click', handleSearch);
        mainSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSearch();
        });
    }

    fetchPopularBooks();
});