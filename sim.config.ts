// Krümel-Evolution: simülasyonun TÜM parametreleri bu dosyada.
// Denge ayarı için yalnızca burayı değiştir. Her gün çalıştırıldığında
// kullanılan config, kayıt ve state dosyasına da yazılır (süreklilik için).

export const simConfig = {
  /** Varsayılan seed (CLI'den --seed ile değiştirilebilir) */
  seed: 10,

  /** 2D arena, birim cinsinden (render'da kareye ölçeklenir) */
  arena: { width: 50, height: 50 },

  /** Bir "Tag" (bölüm) kaç nesil. Her nesil yemek tükenene kadar sürer
   *  (ya da herkes doyana/enerjisi bitene kadar); güvenlik için adım sınırı var. */
  day: { generations: 5, maxStepsPerGeneration: 1000 },

  /** Tag 1 başlangıcı: özdeş Krümel'ler */
  initial: {
    count: 5, // az sayıda: izleyici tek tek takip edebilsin
    genes: { speed: 1, size: 1, sense: 1 },
  },

  /** Gen değerlerini dünya birimlerine çeviren temel çarpanlar */
  base: {
    speed: 1.0, // speed=1 → adım başına 1 birim
    radius: 1.2, // size=1 → gövde yarıçapı
    sense: 10, // sense=1 → 10 birim görüş mesafesi
    turnJitter: 0.35, // rastgele dolaşırken yön değişimi (radyan, std)
  },

  food: {
    initial: 2, // neslin başında hazır olan yemek
    spawnPerStep: 0.05, // ilk spawnWindow adımda, adım başına bu olasılıkla yeni yemek
    spawnWindow: 120, // bu adımdan sonra yeni yemek çıkmaz; nesil kalan yemek bitince sona erer
    // → nesil başına beklenen yemek ≈ initial + spawnPerStep × spawnWindow (kıtlığın ayarı)
    max: 30, // aynı anda en fazla yemek
    radius: 0.6,
  },

  energy: {
    budget: 1000, // her nesil başında dolan enerji
    // hareket maliyeti / adım = costScale × (size³ × speed² + sense)
    costScale: 1.0,
  },

  rules: {
    foodToSurvive: 1, // en az bu kadar yiyen yaşar
    foodPerChild: 1, // hayatta kalmanın üstündeki her 1 yemek = 1 yavru (2 yiyen 1, 3 yiyen 2 yavru…)
    maxChildren: 6, // bir nesilde en fazla yavru
    // Doyup durmak yok: herkes yemek bitene kadar aramaya devam eder.
  },

  mutation: {
    chancePerGene: 0.25, // her gen için mutasyon olasılığı
    sd: 0.15, // göreli değişim (normal dağılım std)
    min: 0.3, // hiçbir gen bunun altına inemez
    max: 3.0,
  },

  /** Yırtıcılık: Tag 1'de kapalı, sonradan bir olayla açılabilir */
  predation: {
    enabled: false,
    sizeRatio: 1.2, // avcı en az bu kat büyük olmalı
    foodValue: 1, // avı yemek kaç yemek sayılır
  },

  /** Kayıt hassasiyeti (render verisini küçük tutmak için) */
  record: { decimals: 1 },
};

export type SimConfig = typeof simConfig;
