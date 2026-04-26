
import { saveBookToFirebase } from "../books/addBook.js";
import { BookRequest } from "../books/bookRequest.js";
const bookRequester = new BookRequest();

// Sayfa yüklendiğinde çalışacak kısım
window.addEventListener('DOMContentLoaded', () => {
    // URL'deki ?search=kelime kısmını oku
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('search');

    if (searchQuery) {
        // Arama kutusuna gelen kelimeyi yaz
        const inputField = document.getElementById('searchInput');
        if(inputField) inputField.value = searchQuery;

        // Otomatik aramayı başlat
        fetchBooks(searchQuery); 
    }
});



const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const booksContainer = document.getElementById('books-container');

// Arama butonuna tıklama olayı
searchBtn.addEventListener('click', () => {
    const query = searchInput.value;
    if (query) {
        fetchBooks(query);
    }
});


async function fetchBooks(query) {
    booksContainer.innerHTML = '<p>Kitaplar aranıyor...</p>';
    
    try {
        const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=20`);
        const data = await response.json();
        
        displayBooks(data.items);
    } catch (error) {
        console.error("Hata oluştu:", error);
        booksContainer.innerHTML = '<p>Bir hata oluştu, lütfen tekrar deneyin.</p>';
    }
}



function displayBooks(books) {
    booksContainer.innerHTML = ''; 
    if (!books || books.length === 0) {
        bookRequester.toggleVisibility(true); // İstek formunu göster
        booksContainer.innerHTML ='<div style="grid-column: 1/-1; width: 100%;"><p class="no-results">Aradığınız kitap bulunamadı.</p></div>' ;
        return; // Fonksiyonu burada kes, aşağıya devam etmesin
    }

    bookRequester.toggleVisibility(false); // Kitap varsa formu gizle

    books.forEach(book => {
        const info = book.volumeInfo;
        const thumbnail = info.imageLinks ? info.imageLinks.thumbnail : 'https://via.placeholder.com/128x192?text=Kapak+Yok';
        
        // Kitap kartını oluştur
        const bookCard = document.createElement('div');
        bookCard.className = 'book-card';
       
        bookCard.innerHTML = `
           <img src="${thumbnail}" 
               alt="${info.title}" 
               loading="lazy" 
               onerror="this.onerror=null; this.src='img/default-book.jpg';">
            <div class="book-info">
                <h3>${info.title}</h3>
                <p>${info.authors ? info.authors.join(', ') : 'Bilinmeyen Yazar'}</p>
                <button class="view-btn" data-id="${book.id}">Kitabı İncele</button>
            </div>
        `;
        booksContainer.appendChild(bookCard);
    });
}

// Olay Delegasyonu: Tek bir listener, tüm butonları yönetir
booksContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('view-btn')) {
        const bookId = e.target.getAttribute('data-id');
        window.location.href = `book-detail.html?id=${bookId}`;
    }
});



