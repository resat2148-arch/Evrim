# Serie: "Krümel-Evolution" (Arbeitstitel) — YouTube Shorts

Bu dosya Claude Code için proje özetidir. Proje klasörüne `CLAUDE.md` olarak koy.

## Konsept
Kodla GERÇEKTEN çalışan bir evrim simülasyonu. Küçük canlılar ("Krümel") yemek arar, ürer, mutasyona uğrar. Her bölüm = 1 gün = birkaç nesil. Sonuçlar uydurulmaz; simülasyon çalıştırılır ve gerçekte ne olduysa o anlatılır. İzleyiciler yorumlarda bir sonraki olaya oy verir (yırtıcı, buz çağı, kıtlık…).

- Platform: YouTube Shorts (sonra Reels/TikTok)
- Dil: Almanca (görsel ağırlıklı olduğu için ileride İngilizce versiyon da mümkün)

## Temel ilke: Simülasyon ve render ayrı
1. **Simülasyon motoru** (TypeScript, Node'da çalışır): Dünyayı adım adım hesaplar, her adımın durumunu ve istatistikleri JSON olarak kaydeder.
2. **Render** (Remotion): Kaydedilmiş JSON'u okuyup videoya çevirir. Remotion'ın kendisi simülasyon hesaplamaz.

Neden: Remotion kareleri paralel ve sırasız render eder; simülasyon ise sıralı olmalı. Ayrıca kaydedilmiş veri sayesinde aynı sonucu tekrar tekrar render edebiliriz.

## Süreklilik (çok önemli)
- **Seed'li rastgelelik:** Tüm rastgelelik tek bir seed'li RNG'den gelir. Aynı seed = aynı sonuç.
- **Gün sonu kaydı:** Her günün sonunda dünyanın tam durumu `state/day-XX-end.json` olarak kaydedilir. Ertesi gün simülasyon bu dosyadan devam eder. Böylece seri boyunca TEK bir kesintisiz dünya olur.
- **Olay ekleme:** İzleyici oyuyla gelen olay (örn. yırtıcı) günün başında `events/day-XX.json` ile eklenir.

## Simülasyon kuralları (başlangıç)
- 2D arena, yemek noktaları her adımda rastgele belirir
- Her Krümel'in genleri: `speed`, `size`, `sense` (görüş mesafesi)
- Enerji maliyeti: hareket ederken enerji harcanır; büyük ve hızlı olmak daha çok enerji ister (yaklaşık size³ × speed² + sense)
- Gün sonunda: hiç yemeyen ölür, bir kez yiyen yaşar, iki kez yiyen yavru yapar
- Yavru, ebeveynin genlerini küçük bir mutasyonla alır
- Büyük olan, kendinden belirgin şekilde küçük olanı yiyebilir (yırtıcılık sonradan bir olayla açılabilir)
- Parametreler tek bir config dosyasında; dengeyi bulana kadar ayarlanacak

## Görsel bileşenler
1. **DayCounter** — ilk karede büyük "Tag X"
2. **Arena** — kuşbakışı; Krümel'ler gen değerlerine göre renk/boyut alır (örn. hız = renk tonu, boyut = çap)
3. **PopulationGraph** — köşede canlı çizilen nüfus grafiği
4. **GeneStats** — ortalama hız/boyut/görüş çubukları
5. **NamedHero** — öne çıkan bir Krümel'i isimle (örn. "Gerhard") takip eden vurgu halkası
6. **EventCard** — olay duyurusu ("Ein Raubtier ist aufgetaucht!")
7. **VoteCard** — son 3 sn: "Raubtier oder Eiszeit? Ihr entscheidet!"

## Video yapısı (35–50 sn)
- 0–3 sn: "Tag X" + bir cümlelik özet
- 3–35 sn: hızlandırılmış simülasyon + grafik + anlatım
- Son 3–5 sn: sonuç + oylama sorusu

## Tag 1–3 (çerçeve; gerçek sonuçlar simülasyondan gelecek)
- **Tag 1:** 20 özdeş Krümel, kıt yemek. Kurallar 10 sn'de: *"Wer nicht frisst, stirbt. Wer zweimal frisst, bekommt ein Kind."* İlk mutasyonlar ortaya çıkar. Oylama: Raubtier oder Eiszeit?
- **Tag 2:** Kazanan olay uygulanır. Simülasyonun gerçek sonucu anlatılır.
- **Tag 3:** Gerçek sonuca göre devam; yeni bir tür/strateji ortaya çıktıysa ona isim verilir.

## İlk görev (Claude Code için)
1. Simülasyon motorunu yaz (seed'li RNG, config dosyası, gün sonu kaydı)
2. Motoru birkaç farklı seed ile çalıştır ve nüfus eğrilerini özetle; ilk günde hepsinin ölmediği ve hemen patlamadığı dengeli bir ayar bul
3. Remotion projesini kur ve Tag 1'i kayıtlı veriden render et
4. Önemli anlardan 4-5 still kare çıkar
