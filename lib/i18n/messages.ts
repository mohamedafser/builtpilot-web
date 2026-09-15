import type { AppLanguage } from "@/lib/i18n/config";

export type MessageKey =
  | "nav.dashboard"
  | "nav.ai"
  | "nav.projects"
  | "nav.quotations"
  | "nav.workers"
  | "nav.materials"
  | "nav.vendors"
  | "nav.account"
  | "nav.settings"
  | "nav.signOut"
  | "nav.expandSidebar"
  | "nav.collapseSidebar"
  | "common.save"
  | "common.cancel"
  | "common.loading"
  | "common.language"
  | "common.currency"
  | "common.country"
  | "auth.fullName"
  | "auth.businessName"
  | "auth.email"
  | "auth.password"
  | "auth.confirmPassword"
  | "auth.createAccount"
  | "auth.creatingAccount"
  | "auth.countryHint"
  | "settings.title"
  | "settings.subtitle"
  | "settings.workspace"
  | "settings.preferencesSaved"
  | "settings.languageHelp"
  | "settings.currencyHelp"
  | "account.title"
  | "account.subtitle"
  | "account.name"
  | "account.email"
  | "account.business"
  | "account.role"
  | "account.language";

type Dictionary = Record<MessageKey, string>;

const en: Dictionary = {
  "nav.dashboard": "Dashboard",
  "nav.ai": "BuildPilot AI",
  "nav.projects": "Projects",
  "nav.quotations": "Quotations",
  "nav.workers": "Workers",
  "nav.materials": "Materials",
  "nav.vendors": "Vendors",
  "nav.account": "Account",
  "nav.settings": "Settings",
  "nav.signOut": "Sign out",
  "nav.expandSidebar": "Expand sidebar",
  "nav.collapseSidebar": "Collapse sidebar",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.loading": "Loading...",
  "common.language": "Language",
  "common.currency": "Currency",
  "common.country": "Country",
  "auth.fullName": "Full name",
  "auth.businessName": "Business name",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.confirmPassword": "Confirm password",
  "auth.createAccount": "Create account",
  "auth.creatingAccount": "Creating account...",
  "auth.countryHint":
    "Detected from your location. Currency is set from this country.",
  "settings.title": "Workspace settings",
  "settings.subtitle": "Language and currency preferences for your business.",
  "settings.workspace": "Workspace",
  "settings.preferencesSaved": "Preferences saved.",
  "settings.languageHelp": "Default language is English. Change anytime.",
  "settings.currencyHelp":
    "Currency is set automatically from country (India → INR, UAE → AED).",
  "account.title": "Your workspace",
  "account.subtitle":
    "Account details come from your Supabase session and membership.",
  "account.name": "Name",
  "account.email": "Email",
  "account.business": "Business",
  "account.role": "Role",
  "account.language": "Language",
};

const ta: Dictionary = {
  ...en,
  "nav.dashboard": "டாஷ்போர்டு",
  "nav.ai": "BuildPilot AI",
  "nav.projects": "திட்டங்கள்",
  "nav.quotations": "மேற்கோள்கள்",
  "nav.workers": "தொழிலாளர்கள்",
  "nav.materials": "பொருட்கள்",
  "nav.vendors": "விற்பனையாளர்கள்",
  "nav.account": "கணக்கு",
  "nav.settings": "அமைப்புகள்",
  "nav.signOut": "வெளியேறு",
  "nav.expandSidebar": "பக்கப்பட்டியை விரிவாக்கு",
  "nav.collapseSidebar": "பக்கப்பட்டியை சுருக்கு",
  "common.save": "சேமி",
  "common.cancel": "ரத்து",
  "common.loading": "ஏற்றுகிறது...",
  "common.language": "மொழி",
  "common.currency": "நாணயம்",
  "common.country": "நாடு",
  "auth.fullName": "முழு பெயர்",
  "auth.businessName": "வணிகப் பெயர்",
  "auth.email": "மின்னஞ்சல்",
  "auth.password": "கடவுச்சொல்",
  "auth.confirmPassword": "கடவுச்சொல்லை உறுதிப்படுத்து",
  "auth.createAccount": "கணக்கை உருவாக்கு",
  "auth.creatingAccount": "கணக்கு உருவாக்கப்படுகிறது...",
  "auth.countryHint":
    "உங்கள் இடத்திலிருந்து கண்டறியப்பட்டது. இந்நாட்டின் அடிப்படையில் நாணயம் அமைக்கப்படும்.",
  "settings.title": "பணியிட அமைப்புகள்",
  "settings.subtitle": "உங்கள் வணிகத்திற்கான மொழி மற்றும் நாணய விருப்பங்கள்.",
  "settings.workspace": "பணியிடம்",
  "settings.preferencesSaved": "விருப்பங்கள் சேமிக்கப்பட்டன.",
  "settings.languageHelp": "இயல்பு மொழி ஆங்கிலம். எப்போது வேண்டுமானாலும் மாற்றலாம்.",
  "settings.currencyHelp":
    "நாணயம் நாட்டின் அடிப்படையில் தானாக அமைக்கப்படும் (இந்தியா → INR, UAE → AED).",
  "account.title": "உங்கள் பணியிடம்",
  "account.subtitle": "கணக்கு விவரங்கள் உங்கள் அமர்வு மற்றும் உறுப்பினரிலிருந்து வருகின்றன.",
  "account.name": "பெயர்",
  "account.email": "மின்னஞ்சல்",
  "account.business": "வணிகம்",
  "account.role": "பங்கு",
  "account.language": "மொழி",
};

const ar: Dictionary = {
  ...en,
  "nav.dashboard": "لوحة التحكم",
  "nav.ai": "BuildPilot AI",
  "nav.projects": "المشاريع",
  "nav.quotations": "عروض الأسعار",
  "nav.workers": "العمال",
  "nav.materials": "المواد",
  "nav.vendors": "الموردون",
  "nav.account": "الحساب",
  "nav.settings": "الإعدادات",
  "nav.signOut": "تسجيل الخروج",
  "nav.expandSidebar": "توسيع الشريط الجانبي",
  "nav.collapseSidebar": "طي الشريط الجانبي",
  "common.save": "حفظ",
  "common.cancel": "إلغاء",
  "common.loading": "جارٍ التحميل...",
  "common.language": "اللغة",
  "common.currency": "العملة",
  "common.country": "الدولة",
  "auth.fullName": "الاسم الكامل",
  "auth.businessName": "اسم النشاط",
  "auth.email": "البريد الإلكتروني",
  "auth.password": "كلمة المرور",
  "auth.confirmPassword": "تأكيد كلمة المرور",
  "auth.createAccount": "إنشاء حساب",
  "auth.creatingAccount": "جارٍ إنشاء الحساب...",
  "auth.countryHint":
    "تم اكتشافها من موقعك. تُعيَّن العملة حسب هذه الدولة.",
  "settings.title": "إعدادات مساحة العمل",
  "settings.subtitle": "تفضيلات اللغة والعملة لنشاطك.",
  "settings.workspace": "مساحة العمل",
  "settings.preferencesSaved": "تم حفظ التفضيلات.",
  "settings.languageHelp": "اللغة الافتراضية هي الإنجليزية. يمكنك تغييرها في أي وقت.",
  "settings.currencyHelp":
    "تُعيَّن العملة تلقائيًا حسب الدولة (الهند → INR، الإمارات → AED).",
  "account.title": "مساحة عملك",
  "account.subtitle": "تفاصيل الحساب من جلستك وعضويتك.",
  "account.name": "الاسم",
  "account.email": "البريد الإلكتروني",
  "account.business": "النشاط",
  "account.role": "الدور",
  "account.language": "اللغة",
};

const hi: Dictionary = {
  ...en,
  "nav.dashboard": "डैशबोर्ड",
  "nav.ai": "BuildPilot AI",
  "nav.projects": "परियोजनाएँ",
  "nav.quotations": "कोटेशन",
  "nav.workers": "कर्मचारी",
  "nav.materials": "सामग्री",
  "nav.vendors": "विक्रेता",
  "nav.account": "खाता",
  "nav.settings": "सेटिंग्स",
  "nav.signOut": "साइन आउट",
  "nav.expandSidebar": "साइडबार बढ़ाएँ",
  "nav.collapseSidebar": "साइडबार समेटें",
  "common.save": "सहेजें",
  "common.cancel": "रद्द करें",
  "common.loading": "लोड हो रहा है...",
  "common.language": "भाषा",
  "common.currency": "मुद्रा",
  "common.country": "देश",
  "auth.fullName": "पूरा नाम",
  "auth.businessName": "व्यवसाय का नाम",
  "auth.email": "ईमेल",
  "auth.password": "पासवर्ड",
  "auth.confirmPassword": "पासवर्ड की पुष्टि करें",
  "auth.createAccount": "खाता बनाएँ",
  "auth.creatingAccount": "खाता बनाया जा रहा है...",
  "auth.countryHint":
    "आपके स्थान से पहचाना गया। इस देश के अनुसार मुद्रा सेट होगी।",
  "settings.title": "कार्यक्षेत्र सेटिंग्स",
  "settings.subtitle": "आपके व्यवसाय के लिए भाषा और मुद्रा प्राथमिकताएँ।",
  "settings.workspace": "कार्यक्षेत्र",
  "settings.preferencesSaved": "प्राथमिकताएँ सहेजी गईं।",
  "settings.languageHelp": "डिफ़ॉल्ट भाषा अंग्रेज़ी है। कभी भी बदल सकते हैं।",
  "settings.currencyHelp":
    "मुद्रा देश के अनुसार अपने आप सेट होती है (भारत → INR, UAE → AED)।",
  "account.title": "आपका कार्यक्षेत्र",
  "account.subtitle": "खाता विवरण आपके सत्र और सदस्यता से आते हैं।",
  "account.name": "नाम",
  "account.email": "ईमेल",
  "account.business": "व्यवसाय",
  "account.role": "भूमिका",
  "account.language": "भाषा",
};

const dictionaries: Record<AppLanguage, Dictionary> = {
  en,
  ta,
  ar,
  hi,
};

export function translate(
  language: AppLanguage,
  key: MessageKey,
): string {
  return dictionaries[language][key] ?? dictionaries.en[key] ?? key;
}

export function getDictionary(language: AppLanguage): Dictionary {
  return dictionaries[language] ?? dictionaries.en;
}
