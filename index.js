const admin = require("firebase-admin");
const axios = require("axios");

// استدعاء ملف مفتاح الصلاحيات السري الخاص بالفايربيز
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://syria-dolar-default-rtdb.firebaseio.com/" // رابط قاعدة بياناتك المباشر
});

const db = admin.database();
const ref = db.ref("MarketPrices");

async function updatePrices() {
  try {
    console.log("جاري جلب الأسعار من موقع الليرة اليوم...");
    
    // جلب البيانات من الـ API الداخلي للموقع مع إضافة الـ User-Agent لتجنب الحظر
    const response = await axios.get("https://sp-today.com/api/currates", {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
      }
    });

    const rates = response.data;
    if (!rates || !Array.isArray(rates)) {
      console.log("فشل جلب البيانات أو أن صيغة الملف غير مدعومة.");
      return;
    }

    // الحصول على الوقت الحالي بتوقيت دمشق وتنسيقه للتطبيق
    const options = { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Damascus' };
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const timestamp = formatter.format(new Date()).toLowerCase(); // سيظهر مثل: 04:52 pm

    let updateData = {
      timestamp: timestamp
    };

    // خريطة لربط أسماء العملات في الموقع بالرموز المستخدمة في تطبيقك
    const keyMapping = {
      'usd': 'USD',
      'eur': 'EUR',
      'try': 'TRY',
      'gold_24': 'G24',
      'gold_21': 'G21',
      'gold_18': 'G18'
    };

    // معالجة مصفوفة الأسعار القادمة من الموقع وتوزيعها حسب الهيكلية الخاصة بك
    rates.forEach(item => {
      if (item && item.code) {
        const targetKey = keyMapping[item.code.toLowerCase()];
        if (targetKey) {
          updateData[targetKey] = {
            price: String(item.sell), // نأخذ سعر المبيع المتداول
            direction: item.direction || "stable",
            changePercent: parseFloat(item.change || 0)
          };
        }
      }
    });

    // تحديث كل الأسعار في الفايربيز دفعة واحدة بشكل آمن
    await ref.update(updateData);
    console.log("تم تحديث الأسعار في الفايربيز بنجاح! 🎉 التوقيت الحالي:", updateData.timestamp);

  } catch (error) {
    console.error("حدث خطأ أثناء جلب وتحديث الأسعار:", error.message);
  }
}

// تشغيل السكربت فوراً عند الإقلاع لأول مرة
updatePrices();

// تكرار السكربت تلقائياً كل 15 دقيقة (900,000 مللي ثانية) على السيرفر
setInterval(updatePrices, 900000);
