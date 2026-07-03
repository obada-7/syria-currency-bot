const admin = require("firebase-admin");
const axios = require("axios");

// جلب المفتاح السري من بيئة النظام
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://syria-dolar-default-rtdb.firebaseio.com/"
});

const db = admin.database();
const ref = db.ref("MarketPrices");

async function updatePrices() {
  try {
    console.log("جاري جلب الأسعار...");
    const response = await axios.get("https://sp-today.com/api/currates", {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://sp-today.com/'
      },
      timeout: 20000
    });

    const rates = response.data;
    if (!Array.isArray(rates)) throw new Error("البيانات غير صحيحة");

    let updateData = { timestamp: new Date().toLocaleTimeString('ar-SY', { timeZone: 'Asia/Damascus' }) };
    
    const mapping = { 'usd': 'USD', 'eur': 'EUR', 'try': 'TRY', 'gold_24': 'G24', 'gold_21': 'G21', 'gold_18': 'G18' };
    
    rates.forEach(item => {
      if (item.code && mapping[item.code.toLowerCase()]) {
        updateData[mapping[item.code.toLowerCase()]] = {
          price: String(item.sell),
          direction: item.direction || "stable",
          changePercent: parseFloat(item.change || 0)
        };
      }
    });

    await ref.update(updateData);
    console.log("تم التحديث بنجاح");
  } catch (error) {
    console.error("خطأ:", error.message);
    process.exit(1);
  }
}

updatePrices();
