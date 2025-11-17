# Mein Deutsch-Tagebuch

Küçük, sade bir web sayfası: Almanca çalışırken öğrendiğin her şeyi
(notlar, cümleler, kalıplar, resimler) kart kart kaydedebilirsin.

## Nasıl kullanırım?

1. Bu projeyi bir klasöre koy:
   - `index.html`
   - `assets/styles.css`
   - `assets/app.js`

2. Bilgisayarında `index.html` dosyasını çift tıklayıp aç:
   - Sağ üstte **Neuer Eintrag** butonuna tıkla.
   - **Titel**: Konu başlığı (z.B. "Trennbare Verben", "Redemittel Brief").
   - **Notizen**:
     - Almanca cümleler
     - Türkçe açıklamalar
     - Küçük kurallar

3. Basit metin formatlama:
   - `**Text**` → **kalın**
   - `*Text*` → *italik*
   - Satır atlamak için normal Enter yeterli.

4. Resim ekleme:
   - **Bild** alanında dosya seç.
   - Resim, tarayıcıda `localStorage` içinde tutulur (internet yok, sadece sen görürsün).

5. Silme:
   - Her kartın sağ üstünde **Löschen** butonu var.

## GitHub & GitHub Pages

1. GitHub'da yeni repo aç: z.B. `deutsch-tagebuch`.
2. Bu dosyaları repoya kopyala ve commit/push yap.
3. GitHub → Settings → "Pages" bölümünden:
   - Source: `Deploy from a branch`
   - Branch: `main` / `/ (root)`
4. Birkaç saniye sonra sana bir URL verecek:
   - Örn: `https://kullaniciadin.github.io/deutsch-tagebuch/`

Artık bu URL’yi açtığında, her yerden kendi Almanca günlüğünü kullanabilirsin.
