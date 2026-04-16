import { auth, db } from '../firebase/firebaseConfig.js'; 
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

// --- Seçiciler ---
const contactForm = document.getElementById('contactForm');
const contactEmail = document.getElementById('contactEmail');
const contactMessage = document.getElementById('contactMessage');
const charCount = document.getElementById('charCount');

// Kullanıcı giriş yaptıys eposta otomatik gelir
onAuthStateChanged(auth, (user) => {
    if (user && contactEmail) {
        contactEmail.value = user.email;
        contactEmail.readOnly = true; 
        contactEmail.style.opacity = "0.7"; 
    }
});

// Canlı karakter sayıcı
if (contactMessage && charCount) {
    contactMessage.addEventListener('input', () => {
        const currentLength = contactMessage.value.length;
        
        charCount.innerText = currentLength;

        if (currentLength >= 1000) {
            charCount.style.color = "#ce3221";
            charCount.style.fontWeight = "bold";
        } else if (currentLength >= 500) {
            charCount.style.color = "#c98623";
            charCount.style.fontWeight = "bold";
        } else {
            charCount.style.color = "#777";
            charCount.style.fontWeight = "normal";
        }
    });
}

// Form gönderme işlemi
if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = contactForm.querySelector('.btn-primary');
        const email = contactEmail.value;
        const subject = document.getElementById('contactSubject').value;
        const message = contactMessage.value;

        try {
            // Butonu kilitle
            submitBtn.innerText = "Gönderiliyor...";
            submitBtn.disabled = true;

            // --- FIRESTORE KAYIT İŞLEMİ ---
            // "contact_messages" adında bir koleksiyona veriyi ekliyoruz
            await addDoc(collection(db, "contact_messages"), {
                user_email: email,
                message_subject: subject,
                user_message: message,
                status: "read", // İleride admin paneli yaparsan diye
                createdAt: serverTimestamp() // Sunucu saatini baz alalım
            });

            // Başarılı uyarısı
            alert(`Harika! Mesajın bize başarıyla ulaştı. En kısa sürede dönüş sağlayacağız. \nKonu: ${subject}`);
            
            // Formu temizle
            contactForm.reset();
            if (charCount) {
                charCount.innerText = "0";
                charCount.style.color = "#777";
            }

            // Giriş yapmış kullanıcının mailini geri getir
            if (auth.currentUser) contactEmail.value = auth.currentUser.email;

        } catch (error) {
            console.error("Firestore kayıt hatası:", error);
            alert("Hay aksi! Mesajın veritabanına ulaşamadı. İnternetini veya Firebase kurallarını kontrol et kanka.");
        } finally {
            // Hata olsa da olmasa da butonu eski haline getir
            submitBtn.innerText = "Gönder";
            submitBtn.disabled = false;
        }
    });
}