const admin = require("firebase-admin");
const axios = require("axios");

// استدعاء ملف مفتاح الصلاحيات السري الخاص بالفايربيز
const serviceAccount = require("./serviceAccountKey.json");

// التحقق من صحة مفتاح الفايربيز قبل بدء الاتصال لتفادي الانهيار
if (!serviceAccount.project_id || !serviceAccount.private_key) {
  console.error("⚠️ خطأ كادح: ملف serviceAccountKey.json غير صحيح أو ناقص بيانات! يرجى إعادة نسخه بالكامل.");
}

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://syria-dolar-default-rtdb.firebaseio.com/" // رابط قاعدة بياناتك المباشر
  });
} catch (initError) {
  console.error("فشل تهيئة Firebase:", initError.message);
}

const db = admin.database();
const ref = db.ref("MarketPrices");

async function updatePrices() {
  try {
    console.log("جاري جلب الأسعار من موقع الليرة اليوم...");
    
    // جلب البيانات مع حزمة كاملة من الـ Headers لتفادي حظر الـ 403 تماماً
    const response = await axios.get("https://sp-today.com/api/currates", {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
        'Origin': 'https://sp-today.com',
        'Referer': 'https://sp-today.com/',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      timeout: 15000 // مهلة 15 ثانية للاتصال كحد أقصى
    });

    const rates = response.data;
    if (!rates || !Array.isArray(rates)) {
      console.log("فشل جلب البيانات أو أن صيغة الملف غير مدعومة من المصدر.");
      return;
    }

    // الحصول على الوقت الحالي بتوقيت دمشق وتنسيقه للتطبيق
    const options = { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Damascus' };
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const timestamp = formatter.format(new Date()).toLowerCase(); // مثل: 04:52 pm

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
    console.log("🎉 تم تحديث الأسعار في الفايربيز بنجاح! التوقيت الحالي بدمشق:", updateData.timestamp);

  } catch (error) {
    if (error.response) {
      console.error(`❌ خطأ سيرفر الموقع (${error.response.status}): حظر أو مشكلة من المصدر.`);
    } else {
      console.error("❌ حدث خطأ أثناء جلب وتحديث الأسعار:", error.message);
    }
  }
}

// تشغيل السكربت فوراً عند الإقلاع لأول مرة
updatePrices();          updateData[targetKey] = {
            price: String(item.sell), // نأخذ سعر المبيع المتداول
            direction: item.direction || "stable",
            changePercent: parseFloat(item.change || 0)
          };
        }
      }
    });

    // تحديث كل الأسعار في الفايربيز دفعة واحدة بشكل آمن
    await ref.update(updateData);
    console.log("🎉 تم تحديث الأسعار في الفايربيز بنجاح! التوقيت الحالي بدمشق:", updateData.timestamp);

  } catch (error) {
    if (error.response) {
      console.error(`❌ خطأ سيرفر الموقع (${error.response.status}): حظر أو مشكلة من المصدر.`);
    } else {
      console.error("❌ حدث خطأ أثناء جلب وتحديث الأسعار:", error.message);
    }
  }
}

// تشغيل السكربت فوراً عند الإقلاع لأول مرة
updatePrices();
