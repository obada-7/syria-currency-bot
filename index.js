const admin = require("firebase-admin");
const axios = require("axios");

// استدعاء ملف مفتاح الصلاحيات السري الخاص بالفايربيز
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://syria-dolar-default-rtdb.firebaseio.com/"
});

const db = admin.database();
const ref = db.ref("MarketPrices");

async function updatePrices() {
  try {
    console.log("جاري جلب الأسعار من موقع الليرة اليوم...");
    
    const response = await axios.get("https://sp-today.com/api/currates", {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Origin': 'https://sp-today.com',
        'Referer': 'https://sp-today.com/'
      },
      timeout: 15000
    });

    const rates = response.data;
    if (!rates || !Array.isArray(rates)) {
      console.log("فشل جلب البيانات أو أن صيغة الملف غير مدعومة.");
      return;
    }

    const options = { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Damascus' };
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const timestamp = formatter.format(new Date()).toLowerCase();

    let updateData = {
      timestamp: timestamp
    };

    const keyMapping = {
      'usd': 'USD',
      'eur': 'EUR',
      'try': 'TRY',
      'gold_24': 'G24',
      'gold_21': 'G21',
      'gold_18': 'G18'
    };

    rates.forEach(item => {
      if (item && item.code) {
        const targetKey = keyMapping[item.code.toLowerCase()];
        if (targetKey) {
          updateData[targetKey] = {
            price: String(item.sell),
            direction: item.direction || "stable",
            changePercent: parseFloat(item.change || 0)
          };
        }
      }
    });

    await ref.update(updateData);
    console.log("🎉 تم تحديث الأسعار بنجاح! التوقيت:", updateData.timestamp);

  } catch (error) {
    console.error("❌ حدث خطأ أثناء جلب وتحديث الأسعار:", error.message);
  }
}

// تشغيل السكربت
updatePrices();
