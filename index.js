const admin = require("firebase-admin");
const axios = require("axios");

// فك تشفير المفتاح الذي قمت بترميزه بـ Base64
const decodedKey = Buffer.from(process.env.FIREBASE_PRIVATE_KEY, 'base64').toString('utf8');

const serviceAccount = {
  project_id: process.env.FIREBASE_PROJECT_ID,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  private_key: decodedKey
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://syria-dolar-default-rtdb.firebaseio.com/"
});

const db = admin.database();
const ref = db.ref("MarketPrices");

async function updatePrices() {
  try {
    const response = await axios.get("https://sp-today.com/api/currates", {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const rates = response.data;
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
    console.log("تم التحديث بنجاح!");
  } catch (error) {
    console.error("خطأ:", error.message);
  }
}

updatePrices();
