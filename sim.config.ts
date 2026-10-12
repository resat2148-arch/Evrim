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

  /** Dünya: besin haritası + yemeği üreten alg kolonileri. Dünya da Krümel'lerle birlikte değişir:
   *  otlanan koloni küçülür/ölür, ölen Krümel toprağı gübreler, besinli yerde yeni koloni filizlenir. */
  world: {
    grid: 10, // besin haritası: 10×10 kare
    nutrientBase: 0.45, // besinin zamanla döndüğü denge seviyesi
    nutrientRegen: 0.12, // nesil başına dengeye dönüş oranı
    diffusion: 0.2, // nesil başına komşu karelere yayılma
    initialColonies: 3,
    colonyRadius: 3.5, // yemek koloninin bu yarıçapı içinde belirir
    emitPerStep: 0.02, // adım başına, biyokütle başına yemek çıkarma olasılığı
    grazeCost: 0.18, // koloniden yenen her yemek biyokütleden bu kadar götürür
    growth: 0.9, // nesil sonu büyüme hızı (besin × biyokütle × (1 − b/max))
    maxBiomass: 2.5,
    nutrientUse: 0.25, // 1 biyokütle büyümek için harcanan besin
    decay: 0.08, // nesil başına doğal çürüme (yarısı toprağa döner)
    minBiomass: 0.2, // bunun altına düşen koloni ölür
    deathNutrient: 0.5, // açlıktan ölen bir Krümel karesine bu kadar besin bırakır
    sproutThreshold: 0.85, // bu besinin üstündeki karede yeni koloni filizlenebilir
    sproutChance: 0.5,
    sproutBiomass: 0.5,
    spreadAt: 2.4, // bu biyokütlenin üstündeki koloni spor saçabilir
    spreadChance: 0.35,
    minDistance: 7, // koloniler arası en az mesafe
    maxColonies: 6,
  },

  food: {
    initial: 2, // neslin başında rastgele yerlerde sürüklenen parçalar
    spawnWindow: 120, // koloniler yalnızca ilk spawnWindow adımda yemek çıkarır; nesil kalan yemek bitince sona erer
    // → nesil başına beklenen yemek ≈ initial + emitPerStep × toplam biyokütle × spawnWindow
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
