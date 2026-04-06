import { createContext, useContext, useState, type ReactNode } from "react";

type Lang = string;

const translations: Record<string, Record<Lang, string>> = {
  // Navbar
  "nav.apex": { en: "ATLAS", hi: "ATLAS", es: "ATLAS", fr: "ATLAS", de: "ATLAS", ja: "ATLAS", zh: "ATLAS", ar: "ATLAS", pt: "ATLAS", ko: "ATLAS", ru: "ATLAS", tr: "ATLAS" },
  "nav.research": { en: "Research", hi: "रिसर्च", es: "Investigación", fr: "Recherche", de: "Forschung", ja: "リサーチ", zh: "研究", ar: "أبحاث", pt: "Pesquisa", ko: "연구", ru: "Исследования", tr: "Araştırma" },
  "nav.enterprise": { en: "Enterprise", hi: "एंटरप्राइज़", es: "Empresa", fr: "Entreprise", de: "Unternehmen", ja: "エンタープライズ", zh: "企业", ar: "المؤسسات", pt: "Empresa", ko: "기업", ru: "Предприятие", tr: "Kurumsal" },
  "nav.blog": { en: "Blog", hi: "ब्लॉग", es: "Blog", fr: "Blog", de: "Blog", ja: "ブログ", zh: "博客", ar: "مدونة", pt: "Blog", ko: "블로그", ru: "Блог", tr: "Blog" },
  "nav.login": { en: "Log in", hi: "लॉग इन", es: "Iniciar sesión", fr: "Connexion", de: "Anmelden", ja: "ログイン", zh: "登录", ar: "تسجيل الدخول", pt: "Entrar", ko: "로그인", ru: "Войти", tr: "Giriş" },

  // Bottom tabs
  "tab.explore": { en: "Explore", hi: "खोजें", es: "Explorar", fr: "Explorer", de: "Entdecken", ja: "探索", zh: "探索", ar: "استكشاف", pt: "Explorar", ko: "탐색", ru: "Обзор", tr: "Keşfet" },
  "tab.home": { en: "Home", hi: "होम", es: "Inicio", fr: "Accueil", de: "Startseite", ja: "ホーム", zh: "首页", ar: "الرئيسية", pt: "Início", ko: "홈", ru: "Главная", tr: "Ana Sayfa" },
  "tab.referrals": { en: "Referrals", hi: "रेफरल", es: "Referencias", fr: "Parrainages", de: "Empfehlungen", ja: "紹介", zh: "推荐", ar: "الإحالات", pt: "Indicações", ko: "추천", ru: "Рефералы", tr: "Yönlendirmeler" },
  "tab.earnings": { en: "Earnings", hi: "कमाई", es: "Ganancias", fr: "Revenus", de: "Einnahmen", ja: "収益", zh: "收入", ar: "الأرباح", pt: "Ganhos", ko: "수익", ru: "Доход", tr: "Kazançlar" },
  "tab.profile": { en: "Profile", hi: "प्रोफ़ाइल", es: "Perfil", fr: "Profil", de: "Profil", ja: "プロフィール", zh: "个人资料", ar: "الملف الشخصي", pt: "Perfil", ko: "프로필", ru: "Профиль", tr: "Profil" },

  // Hero
  "hero.title": { en: "Build the future. With AI.", hi: "AI के साथ। भविष्य बनाओ।", es: "Construye el futuro. Con IA.", fr: "Construisez l'avenir. Avec l'IA.", de: "Bau die Zukunft. Mit KI.", ja: "未来を創ろう。AIと共に。", zh: "构建未来。用AI。", ar: "ابنِ المستقبل. مع الذكاء الاصطناعي.", pt: "Construa o futuro. Com IA.", ko: "미래를 만들자. AI와 함께.", ru: "Строй будущее. С ИИ.", tr: "Geleceği inşa et. Yapay zeka ile." },
  "hero.subtitle": { en: "Join thousands earning from top AI companies — remote, flexible, and built for your skills.", hi: "हज़ारों लोगों के साथ जुड़ें जो टॉप AI कंपनियों से कमा रहे हैं — रिमोट, फ्लेक्सिबल, आपकी स्किल्स के लिए बना।", es: "Únete a miles que ganan de las mejores empresas de IA — remoto y flexible.", fr: "Rejoignez des milliers qui gagnent avec les meilleures entreprises d'IA.", de: "Schließen Sie sich Tausenden an, die bei Top-KI-Unternehmen verdienen.", ja: "トップAI企業でリモートで稼ぐ仲間に加わろう。", zh: "加入数千人，从顶级AI公司远程赚钱。", ar: "انضم للآلاف الذين يكسبون من أفضل شركات الذكاء الاصطناعي.", pt: "Junte-se a milhares ganhando de empresas de IA — remoto e flexível.", ko: "수천 명과 함께 최고의 AI 기업에서 원격으로 수익을 올리세요.", ru: "Присоединяйтесь к тысячам, зарабатывающим в топовых AI-компаниях.", tr: "Binlerce kişiye katılın — en iyi AI şirketlerinden uzaktan kazanın." },
  "hero.start": { en: "Start working", hi: "काम शुरू करें", es: "Empezar", fr: "Commencer", de: "Loslegen", ja: "始める", zh: "开始工作", ar: "ابدأ العمل", pt: "Começar", ko: "시작하기", ru: "Начать", tr: "Çalışmaya başla" },
  "hero.search": { en: "Search roles", hi: "भूमिकाएं खोजें", es: "Buscar roles", fr: "Rechercher", de: "Rollen suchen", ja: "役割を検索", zh: "搜索职位", ar: "بحث عن أدوار", pt: "Buscar vagas", ko: "역할 검색", ru: "Поиск ролей", tr: "Rolleri ara" },

  // Stats
  "stats.avgPay": { en: "Average pay", hi: "औसत वेतन", es: "Pago promedio", fr: "Salaire moyen", de: "Durchschnittslohn", ja: "平均給与", zh: "平均薪资", ar: "متوسط الأجر", pt: "Pagamento médio", ko: "평균 급여", ru: "Средняя оплата", tr: "Ortalama ücret" },
  "stats.rolesCreated": { en: "Roles created", hi: "बनाई गई भूमिकाएं", es: "Roles creados", fr: "Rôles créés", de: "Erstellte Rollen", ja: "作成された役割", zh: "已创建职位", ar: "الأدوار المنشأة", pt: "Vagas criadas", ko: "생성된 역할", ru: "Создано ролей", tr: "Oluşturulan roller" },
  "stats.dailyPayouts": { en: "Daily payouts", hi: "दैनिक भुगतान", es: "Pagos diarios", fr: "Paiements quotidiens", de: "Tägliche Auszahlungen", ja: "日次支払い", zh: "每日支付", ar: "المدفوعات اليومية", pt: "Pagamentos diários", ko: "일일 지급", ru: "Ежедневные выплаты", tr: "Günlük ödemeler" },

  // Roles
  "roles.latest": { en: "Latest roles", hi: "नवीनतम भूमिकाएं", es: "Últimos roles", fr: "Derniers rôles", de: "Neueste Rollen", ja: "最新の役割", zh: "最新职位", ar: "أحدث الأدوار", pt: "Últimas vagas", ko: "최신 역할", ru: "Новые роли", tr: "Son roller" },
  "roles.hiredRecently": { en: "hired recently", hi: "हाल ही में नियुक्त", es: "contratados", fr: "embauchés", de: "kürzlich eingestellt", ja: "最近採用", zh: "最近录用", ar: "تم توظيفهم", pt: "contratados", ko: "최근 채용", ru: "нанято недавно", tr: "son işe alınan" },
  "roles.apply": { en: "Apply", hi: "आवेदन", es: "Aplicar", fr: "Postuler", de: "Bewerben", ja: "応募", zh: "申请", ar: "تقديم", pt: "Candidatar", ko: "지원", ru: "Подать заявку", tr: "Başvur" },
  "roles.viewAll": { en: "View all roles", hi: "सभी भूमिकाएं देखें", es: "Ver todos", fr: "Voir tout", de: "Alle anzeigen", ja: "すべて表示", zh: "查看全部", ar: "عرض الكل", pt: "Ver todos", ko: "모두 보기", ru: "Все роли", tr: "Tümünü gör" },

  // Profile
  "profile.editProfile": { en: "Edit Profile", hi: "प्रोफ़ाइल संपादित करें", es: "Editar perfil", fr: "Modifier le profil", de: "Profil bearbeiten", ja: "プロフィール編集", zh: "编辑资料", ar: "تعديل الملف", pt: "Editar perfil", ko: "프로필 수정", ru: "Редактировать", tr: "Profili düzenle" },
  "profile.settings": { en: "Settings", hi: "सेटिंग्स", es: "Configuración", fr: "Paramètres", de: "Einstellungen", ja: "設定", zh: "设置", ar: "الإعدادات", pt: "Configurações", ko: "설정", ru: "Настройки", tr: "Ayarlar" },
  "profile.logout": { en: "Log Out", hi: "लॉग आउट", es: "Cerrar sesión", fr: "Déconnexion", de: "Abmelden", ja: "ログアウト", zh: "退出登录", ar: "تسجيل الخروج", pt: "Sair", ko: "로그아웃", ru: "Выйти", tr: "Çıkış" },
  "profile.notLoggedIn": { en: "Not logged in", hi: "लॉग इन नहीं हैं", es: "No conectado", fr: "Non connecté", de: "Nicht angemeldet", ja: "未ログイン", zh: "未登录", ar: "غير مسجل", pt: "Não conectado", ko: "로그인하지 않음", ru: "Не авторизован", tr: "Giriş yapılmadı" },

  // Settings
  "settings.title": { en: "Settings", hi: "सेटिंग्स", es: "Configuración", fr: "Paramètres", de: "Einstellungen", ja: "設定", zh: "设置", ar: "الإعدادات", pt: "Configurações", ko: "설정", ru: "Настройки", tr: "Ayarlar" },
  "settings.notifications": { en: "Notifications", hi: "सूचनाएं", es: "Notificaciones", fr: "Notifications", de: "Benachrichtigungen", ja: "通知", zh: "通知", ar: "الإشعارات", pt: "Notificações", ko: "알림", ru: "Уведомления", tr: "Bildirimler" },
  "settings.darkMode": { en: "Dark Mode", hi: "डार्क मोड", es: "Modo oscuro", fr: "Mode sombre", de: "Dunkelmodus", ja: "ダークモード", zh: "深色模式", ar: "الوضع الداكن", pt: "Modo escuro", ko: "다크 모드", ru: "Тёмная тема", tr: "Karanlık mod" },
  "settings.language": { en: "Language", hi: "भाषा", es: "Idioma", fr: "Langue", de: "Sprache", ja: "言語", zh: "语言", ar: "اللغة", pt: "Idioma", ko: "언어", ru: "Язык", tr: "Dil" },
  "settings.changePassword": { en: "Change Password", hi: "पासवर्ड बदलें", es: "Cambiar contraseña", fr: "Changer le mot de passe", de: "Passwort ändern", ja: "パスワード変更", zh: "修改密码", ar: "تغيير كلمة المرور", pt: "Alterar senha", ko: "비밀번호 변경", ru: "Сменить пароль", tr: "Şifre değiştir" },
  "settings.privacyPolicy": { en: "Privacy Policy", hi: "गोपनीयता नीति", es: "Política de privacidad", fr: "Politique de confidentialité", de: "Datenschutz", ja: "プライバシーポリシー", zh: "隐私政策", ar: "سياسة الخصوصية", pt: "Política de privacidade", ko: "개인정보처리방침", ru: "Конфиденциальность", tr: "Gizlilik politikası" },
  "settings.helpSupport": { en: "Help & Support", hi: "सहायता और समर्थन", es: "Ayuda y soporte", fr: "Aide et support", de: "Hilfe & Support", ja: "ヘルプ", zh: "帮助与支持", ar: "المساعدة والدعم", pt: "Ajuda e suporte", ko: "도움말", ru: "Помощь", tr: "Yardım ve destek" },
  "settings.deleteAccount": { en: "Delete Account", hi: "खाता हटाएं", es: "Eliminar cuenta", fr: "Supprimer le compte", de: "Konto löschen", ja: "アカウント削除", zh: "删除账户", ar: "حذف الحساب", pt: "Excluir conta", ko: "계정 삭제", ru: "Удалить аккаунт", tr: "Hesabı sil" },
  "settings.back": { en: "Back", hi: "वापस", es: "Atrás", fr: "Retour", de: "Zurück", ja: "戻る", zh: "返回", ar: "رجوع", pt: "Voltar", ko: "뒤로", ru: "Назад", tr: "Geri" },
  "settings.close": { en: "Close", hi: "बंद करें", es: "Cerrar", fr: "Fermer", de: "Schließen", ja: "閉じる", zh: "关闭", ar: "إغلاق", pt: "Fechar", ko: "닫기", ru: "Закрыть", tr: "Kapat" },
  "settings.cancel": { en: "Cancel", hi: "रद्द करें", es: "Cancelar", fr: "Annuler", de: "Abbrechen", ja: "キャンセル", zh: "取消", ar: "إلغاء", pt: "Cancelar", ko: "취소", ru: "Отмена", tr: "İptal" },
  "settings.delete": { en: "Delete", hi: "हटाएं", es: "Eliminar", fr: "Supprimer", de: "Löschen", ja: "削除", zh: "删除", ar: "حذف", pt: "Excluir", ko: "삭제", ru: "Удалить", tr: "Sil" },
  "settings.deleteConfirmTitle": { en: "Delete Account?", hi: "खाता हटाएं?", es: "¿Eliminar cuenta?", fr: "Supprimer le compte ?", de: "Konto löschen?", ja: "アカウントを削除？", zh: "删除账户？", ar: "حذف الحساب؟", pt: "Excluir conta?", ko: "계정을 삭제하시겠습니까?", ru: "Удалить аккаунт?", tr: "Hesabı sil?" },
  "settings.deleteConfirmMsg": { en: "This action is permanent and cannot be undone. All your data will be removed.", hi: "यह कार्रवाई स्थायी है और पूर्ववत नहीं की जा सकती। आपका सारा डेटा हटा दिया जाएगा।", es: "Esta acción es permanente. Todos tus datos serán eliminados.", fr: "Cette action est irréversible. Toutes vos données seront supprimées.", de: "Diese Aktion ist dauerhaft. Alle Daten werden gelöscht.", ja: "この操作は永続的です。すべてのデータが削除されます。", zh: "此操作不可撤销。您的所有数据将被删除。", ar: "هذا الإجراء دائم ولا يمكن التراجع عنه.", pt: "Esta ação é permanente. Todos os seus dados serão removidos.", ko: "이 작업은 영구적이며 취소할 수 없습니다.", ru: "Это действие необратимо. Все данные будут удалены.", tr: "Bu işlem kalıcıdır. Tüm verileriniz silinecektir." },
  "settings.currentPassword": { en: "Current password", hi: "वर्तमान पासवर्ड", es: "Contraseña actual", fr: "Mot de passe actuel", de: "Aktuelles Passwort", ja: "現在のパスワード", zh: "当前密码", ar: "كلمة المرور الحالية", pt: "Senha atual", ko: "현재 비밀번호", ru: "Текущий пароль", tr: "Mevcut şifre" },
  "settings.newPassword": { en: "New password", hi: "नया पासवर्ड", es: "Nueva contraseña", fr: "Nouveau mot de passe", de: "Neues Passwort", ja: "新しいパスワード", zh: "新密码", ar: "كلمة المرور الجديدة", pt: "Nova senha", ko: "새 비밀번호", ru: "Новый пароль", tr: "Yeni şifre" },
  "settings.updatePassword": { en: "Update Password", hi: "पासवर्ड अपडेट करें", es: "Actualizar", fr: "Mettre à jour", de: "Aktualisieren", ja: "更新", zh: "更新密码", ar: "تحديث", pt: "Atualizar", ko: "업데이트", ru: "Обновить", tr: "Güncelle" },

  // Edit Profile
  "editProfile.title": { en: "Edit Profile", hi: "प्रोफ़ाइल संपादित करें", es: "Editar perfil", fr: "Modifier le profil", de: "Profil bearbeiten", ja: "プロフィール編集", zh: "编辑资料", ar: "تعديل الملف", pt: "Editar perfil", ko: "프로필 수정", ru: "Редактировать", tr: "Profili düzenle" },
  "editProfile.fullName": { en: "Full Name", hi: "पूरा नाम", es: "Nombre completo", fr: "Nom complet", de: "Vollständiger Name", ja: "氏名", zh: "全名", ar: "الاسم الكامل", pt: "Nome completo", ko: "성명", ru: "Полное имя", tr: "Ad soyad" },
  "editProfile.email": { en: "Email", hi: "ईमेल", es: "Correo", fr: "E-mail", de: "E-Mail", ja: "メール", zh: "邮箱", ar: "البريد الإلكتروني", pt: "E-mail", ko: "이메일", ru: "Email", tr: "E-posta" },
  "editProfile.phone": { en: "Phone", hi: "फ़ोन", es: "Teléfono", fr: "Téléphone", de: "Telefon", ja: "電話", zh: "电话", ar: "الهاتف", pt: "Telefone", ko: "전화", ru: "Телефон", tr: "Telefon" },
  "editProfile.save": { en: "Save Changes", hi: "परिवर्तन सहेजें", es: "Guardar", fr: "Enregistrer", de: "Speichern", ja: "保存", zh: "保存更改", ar: "حفظ", pt: "Salvar", ko: "저장", ru: "Сохранить", tr: "Kaydet" },

  // Explore
  "explore.title": { en: "Explore Roles", hi: "भूमिकाएं खोजें", es: "Explorar roles", fr: "Explorer les rôles", de: "Rollen entdecken", ja: "役割を探索", zh: "探索职位", ar: "استكشاف الأدوار", pt: "Explorar vagas", ko: "역할 탐색", ru: "Обзор ролей", tr: "Rolleri keşfet" },
  "explore.searchPlaceholder": { en: "Search roles...", hi: "भूमिकाएं खोजें...", es: "Buscar roles...", fr: "Rechercher...", de: "Rollen suchen...", ja: "検索...", zh: "搜索职位...", ar: "بحث...", pt: "Buscar vagas...", ko: "검색...", ru: "Поиск...", tr: "Rol ara..." },
  "explore.all": { en: "All", hi: "सभी", es: "Todos", fr: "Tous", de: "Alle", ja: "すべて", zh: "全部", ar: "الكل", pt: "Todos", ko: "전체", ru: "Все", tr: "Tümü" },
  "explore.noResults": { en: "No roles found", hi: "कोई भूमिका नहीं मिली", es: "Sin resultados", fr: "Aucun résultat", de: "Keine Ergebnisse", ja: "結果なし", zh: "未找到职位", ar: "لا توجد نتائج", pt: "Nenhum resultado", ko: "결과 없음", ru: "Не найдено", tr: "Sonuç yok" },
  "explore.tryDifferent": { en: "Try a different search or category", hi: "कोई अलग खोज या श्रेणी आज़माएं", es: "Intenta otra búsqueda", fr: "Essayez une autre recherche", de: "Versuchen Sie eine andere Suche", ja: "別の検索をお試しください", zh: "尝试其他搜索", ar: "جرب بحثاً آخر", pt: "Tente outra busca", ko: "다른 검색을 시도하세요", ru: "Попробуйте другой поиск", tr: "Başka bir arama deneyin" },

  // Referrals
  "referrals.title": { en: "Referrals", hi: "रेफरल", es: "Referencias", fr: "Parrainages", de: "Empfehlungen", ja: "紹介", zh: "推荐", ar: "الإحالات", pt: "Indicações", ko: "추천", ru: "Рефералы", tr: "Yönlendirmeler" },
  "referrals.yourCode": { en: "Your Referral Code", hi: "आपका रेफरल कोड", es: "Tu código", fr: "Votre code", de: "Ihr Code", ja: "紹介コード", zh: "您的推荐码", ar: "رمز الإحالة", pt: "Seu código", ko: "추천 코드", ru: "Ваш код", tr: "Referans kodunuz" },
  "referrals.copy": { en: "Copy", hi: "कॉपी करें", es: "Copiar", fr: "Copier", de: "Kopieren", ja: "コピー", zh: "复制", ar: "نسخ", pt: "Copiar", ko: "복사", ru: "Копировать", tr: "Kopyala" },
  "referrals.howItWorks": { en: "How it works", hi: "यह कैसे काम करता है", es: "Cómo funciona", fr: "Comment ça marche", de: "So funktioniert's", ja: "仕組み", zh: "如何运作", ar: "كيف يعمل", pt: "Como funciona", ko: "작동 방식", ru: "Как это работает", tr: "Nasıl çalışır" },

  // Earnings
  "earnings.title": { en: "Earnings", hi: "कमाई", es: "Ganancias", fr: "Revenus", de: "Einnahmen", ja: "収益", zh: "收入", ar: "الأرباح", pt: "Ganhos", ko: "수익", ru: "Доход", tr: "Kazançlar" },
  "earnings.balance": { en: "Available Balance", hi: "उपलब्ध शेष", es: "Saldo disponible", fr: "Solde disponible", de: "Verfügbares Guthaben", ja: "利用可能残高", zh: "可用余额", ar: "الرصيد المتاح", pt: "Saldo disponível", ko: "사용 가능 잔액", ru: "Доступный баланс", tr: "Mevcut bakiye" },
  "earnings.withdraw": { en: "Withdraw", hi: "निकालें", es: "Retirar", fr: "Retirer", de: "Abheben", ja: "出金", zh: "提现", ar: "سحب", pt: "Sacar", ko: "출금", ru: "Вывести", tr: "Çek" },
  "earnings.history": { en: "Transaction History", hi: "लेनदेन इतिहास", es: "Historial", fr: "Historique", de: "Verlauf", ja: "取引履歴", zh: "交易记录", ar: "سجل المعاملات", pt: "Histórico", ko: "거래 내역", ru: "История", tr: "İşlem geçmişi" },
  "earnings.noTransactions": { en: "No transactions yet", hi: "अभी तक कोई लेनदेन नहीं", es: "Sin transacciones", fr: "Aucune transaction", de: "Keine Transaktionen", ja: "取引なし", zh: "暂无交易", ar: "لا توجد معاملات", pt: "Sem transações", ko: "거래 없음", ru: "Нет транзакций", tr: "Henüz işlem yok" },

  // Apply
  "apply.applyingFor": { en: "Applying for", hi: "आवेदन कर रहे हैं", es: "Aplicando para", fr: "Postuler pour", de: "Bewerben für", ja: "応募先", zh: "申请职位", ar: "التقديم على", pt: "Candidatando-se a", ko: "지원 중", ru: "Подача заявки на", tr: "Başvuru" },
  "apply.personalInfo": { en: "Personal Info", hi: "व्यक्तिगत जानकारी", es: "Datos personales", fr: "Infos personnelles", de: "Persönliche Daten", ja: "個人情報", zh: "个人信息", ar: "معلومات شخصية", pt: "Dados pessoais", ko: "개인 정보", ru: "Личные данные", tr: "Kişisel bilgiler" },
  "apply.experience": { en: "Experience", hi: "अनुभव", es: "Experiencia", fr: "Expérience", de: "Erfahrung", ja: "経験", zh: "经验", ar: "الخبرة", pt: "Experiência", ko: "경험", ru: "Опыт", tr: "Deneyim" },
  "apply.availability": { en: "Availability", hi: "उपलब्धता", es: "Disponibilidad", fr: "Disponibilité", de: "Verfügbarkeit", ja: "稼働可能時期", zh: "可用性", ar: "التوفر", pt: "Disponibilidade", ko: "가용성", ru: "Доступность", tr: "Uygunluk" },
  "apply.fullName": { en: "Full Name", hi: "पूरा नाम", es: "Nombre completo", fr: "Nom complet", de: "Vollständiger Name", ja: "氏名", zh: "全名", ar: "الاسم الكامل", pt: "Nome completo", ko: "성명", ru: "Полное имя", tr: "Ad soyad" },
  "apply.email": { en: "Email Address", hi: "ईमेल पता", es: "Correo electrónico", fr: "Adresse e-mail", de: "E-Mail-Adresse", ja: "メールアドレス", zh: "邮箱地址", ar: "البريد الإلكتروني", pt: "Endereço de e-mail", ko: "이메일 주소", ru: "Email", tr: "E-posta adresi" },
  "apply.phone": { en: "Phone Number", hi: "फ़ोन नंबर", es: "Teléfono", fr: "Téléphone", de: "Telefonnummer", ja: "電話番号", zh: "电话号码", ar: "رقم الهاتف", pt: "Telefone", ko: "전화번호", ru: "Телефон", tr: "Telefon numarası" },
  "apply.linkedin": { en: "LinkedIn Profile", hi: "LinkedIn प्रोफ़ाइल", es: "Perfil de LinkedIn", fr: "Profil LinkedIn", de: "LinkedIn-Profil", ja: "LinkedInプロフィール", zh: "LinkedIn主页", ar: "ملف LinkedIn", pt: "Perfil LinkedIn", ko: "LinkedIn 프로필", ru: "Профиль LinkedIn", tr: "LinkedIn profili" },
  "apply.yearsExp": { en: "Years of Experience", hi: "अनुभव के वर्ष", es: "Años de experiencia", fr: "Années d'expérience", de: "Jahre Erfahrung", ja: "経験年数", zh: "工作年限", ar: "سنوات الخبرة", pt: "Anos de experiência", ko: "경력 연수", ru: "Лет опыта", tr: "Deneyim yılı" },
  "apply.skills": { en: "Key Skills", hi: "मुख्य कौशल", es: "Habilidades clave", fr: "Compétences clés", de: "Schlüsselqualifikationen", ja: "主要スキル", zh: "核心技能", ar: "المهارات الرئيسية", pt: "Habilidades", ko: "핵심 기술", ru: "Ключевые навыки", tr: "Temel beceriler" },
  "apply.resume": { en: "Resume / CV", hi: "रिज्यूमे / CV", es: "Currículum", fr: "CV", de: "Lebenslauf", ja: "履歴書", zh: "简历", ar: "السيرة الذاتية", pt: "Currículo", ko: "이력서", ru: "Резюме", tr: "Özgeçmiş" },
  "apply.uploadResume": { en: "Upload your resume", hi: "अपना रिज्यूमे अपलोड करें", es: "Sube tu CV", fr: "Téléchargez votre CV", de: "Lebenslauf hochladen", ja: "履歴書をアップロード", zh: "上传简历", ar: "ارفع سيرتك الذاتية", pt: "Envie seu currículo", ko: "이력서 업로드", ru: "Загрузите резюме", tr: "Özgeçmişinizi yükleyin" },
  "apply.whenStart": { en: "When can you start?", hi: "आप कब शुरू कर सकते हैं?", es: "¿Cuándo puedes empezar?", fr: "Quand pouvez-vous commencer ?", de: "Wann können Sie anfangen?", ja: "いつ開始できますか？", zh: "何时可以开始？", ar: "متى يمكنك البدء؟", pt: "Quando pode começar?", ko: "언제 시작할 수 있나요?", ru: "Когда можете начать?", tr: "Ne zaman başlayabilirsiniz?" },
  "apply.immediately": { en: "Immediately", hi: "तुरंत", es: "Inmediatamente", fr: "Immédiatement", de: "Sofort", ja: "すぐに", zh: "立即", ar: "فوراً", pt: "Imediatamente", ko: "즉시", ru: "Сразу", tr: "Hemen" },
  "apply.in1Week": { en: "In 1 week", hi: "1 हफ्ते में", es: "En 1 semana", fr: "Dans 1 semaine", de: "In 1 Woche", ja: "1週間後", zh: "1周后", ar: "خلال أسبوع", pt: "Em 1 semana", ko: "1주 후", ru: "Через 1 неделю", tr: "1 hafta içinde" },
  "apply.in2Weeks": { en: "In 2 weeks", hi: "2 हफ्ते में", es: "En 2 semanas", fr: "Dans 2 semaines", de: "In 2 Wochen", ja: "2週間後", zh: "2周后", ar: "خلال أسبوعين", pt: "Em 2 semanas", ko: "2주 후", ru: "Через 2 недели", tr: "2 hafta içinde" },
  "apply.in1Month": { en: "In 1 month", hi: "1 महीने में", es: "En 1 mes", fr: "Dans 1 mois", de: "In 1 Monat", ja: "1ヶ月後", zh: "1个月后", ar: "خلال شهر", pt: "Em 1 mês", ko: "1개월 후", ru: "Через 1 месяц", tr: "1 ay içinde" },
  "apply.hoursPerWeek": { en: "Hours per week", hi: "प्रति सप्ताह घंटे", es: "Horas por semana", fr: "Heures par semaine", de: "Stunden pro Woche", ja: "週あたりの時間", zh: "每周工时", ar: "ساعات في الأسبوع", pt: "Horas por semana", ko: "주당 시간", ru: "Часов в неделю", tr: "Haftalık saat" },
  "apply.coverNote": { en: "Cover Note (Optional)", hi: "कवर नोट (वैकल्पिक)", es: "Nota de presentación", fr: "Lettre de motivation", de: "Anschreiben", ja: "カバーレター", zh: "求职信（可选）", ar: "رسالة تعريفية", pt: "Carta de apresentação", ko: "자기소개서 (선택)", ru: "Сопроводительное письмо", tr: "Ön yazı (İsteğe bağlı)" },
  "apply.continue": { en: "Continue", hi: "आगे बढ़ें", es: "Continuar", fr: "Continuer", de: "Weiter", ja: "続ける", zh: "继续", ar: "متابعة", pt: "Continuar", ko: "계속", ru: "Далее", tr: "Devam" },
  "apply.submit": { en: "Submit Application", hi: "आवेदन जमा करें", es: "Enviar solicitud", fr: "Soumettre", de: "Absenden", ja: "応募する", zh: "提交申请", ar: "إرسال الطلب", pt: "Enviar candidatura", ko: "지원서 제출", ru: "Отправить заявку", tr: "Başvuruyu gönder" },
  "apply.submitted": { en: "Application Submitted!", hi: "आवेदन जमा हो गया!", es: "¡Solicitud enviada!", fr: "Candidature envoyée !", de: "Bewerbung gesendet!", ja: "応募完了！", zh: "申请已提交！", ar: "تم تقديم الطلب!", pt: "Candidatura enviada!", ko: "지원 완료!", ru: "Заявка отправлена!", tr: "Başvuru gönderildi!" },
  "apply.exploreMore": { en: "Explore more", hi: "और देखें", es: "Explorar más", fr: "Explorer plus", de: "Mehr entdecken", ja: "もっと探す", zh: "探索更多", ar: "استكشف المزيد", pt: "Explorar mais", ko: "더 탐색", ru: "Ещё", tr: "Daha fazla" },
  "apply.goHome": { en: "Go Home", hi: "होम जाएं", es: "Ir al inicio", fr: "Accueil", de: "Startseite", ja: "ホームへ", zh: "回首页", ar: "الرئيسية", pt: "Ir ao início", ko: "홈으로", ru: "На главную", tr: "Ana sayfa" },
  "apply.step": { en: "Step", hi: "चरण", es: "Paso", fr: "Étape", de: "Schritt", ja: "ステップ", zh: "步骤", ar: "خطوة", pt: "Passo", ko: "단계", ru: "Шаг", tr: "Adım" },
  "apply.of": { en: "of", hi: "का", es: "de", fr: "de", de: "von", ja: "の", zh: "共", ar: "من", pt: "de", ko: "중", ru: "из", tr: "/" },

  // Common
  "common.back": { en: "Back", hi: "वापस", es: "Atrás", fr: "Retour", de: "Zurück", ja: "戻る", zh: "返回", ar: "رجوع", pt: "Voltar", ko: "뒤로", ru: "Назад", tr: "Geri" },
  "common.selectCountry": { en: "Select Country", hi: "देश चुनें", es: "Seleccionar país", fr: "Choisir le pays", de: "Land wählen", ja: "国を選択", zh: "选择国家", ar: "اختر الدولة", pt: "Selecionar país", ko: "국가 선택", ru: "Выберите страну", tr: "Ülke seçin" },
  "common.searchCountry": { en: "Search country...", hi: "देश खोजें...", es: "Buscar país...", fr: "Rechercher un pays...", de: "Land suchen...", ja: "国を検索...", zh: "搜索国家...", ar: "بحث عن دولة...", pt: "Buscar país...", ko: "국가 검색...", ru: "Поиск страны...", tr: "Ülke ara..." },

  // FAQ
  "settings.faqTitle": { en: "Frequently Asked Questions", hi: "अक्सर पूछे जाने वाले सवाल", es: "Preguntas frecuentes", fr: "Questions fréquentes", de: "Häufige Fragen", ja: "よくある質問", zh: "常见问题", ar: "الأسئلة الشائعة", pt: "Perguntas frequentes", ko: "자주 묻는 질문", ru: "Часто задаваемые вопросы", tr: "Sık Sorulan Sorular" },
  "settings.faq1q": { en: "How do I apply for a role?", hi: "मैं किसी भूमिका के लिए कैसे आवेदन करूं?", es: "¿Cómo solicito un puesto?", fr: "Comment postuler ?", de: "Wie bewerbe ich mich?", ja: "役割に応募するには？", zh: "如何申请职位？", ar: "كيف أتقدم لوظيفة؟", pt: "Como me candidatar?", ko: "어떻게 지원하나요?", ru: "Как подать заявку?", tr: "Bir role nasıl başvururum?" },
  "settings.faq1a": { en: "Go to Explore, find a role you like, tap on it and click 'Apply Now'. Fill the form and submit.", hi: "Explore में जाएं, पसंदीदा भूमिका खोजें, उस पर टैप करें और 'Apply Now' पर क्लिक करें। फॉर्म भरें और सबमिट करें।", es: "Ve a Explorar, encuentra un rol y haz clic en 'Aplicar'.", fr: "Allez dans Explorer, trouvez un rôle et cliquez sur 'Postuler'.", de: "Gehen Sie zu Entdecken, finden Sie eine Rolle und klicken Sie auf 'Bewerben'.", ja: "探索に行き、役割を見つけて応募してください。", zh: "前往探索，找到职位并点击申请。", ar: "اذهب إلى استكشاف، ابحث عن دور وانقر تقدم الآن.", pt: "Vá para Explorar, encontre uma vaga e clique em 'Candidatar-se'.", ko: "탐색에서 역할을 찾아 '지원하기'를 클릭하세요.", ru: "Перейдите в Обзор, найдите роль и нажмите 'Подать заявку'.", tr: "Keşfet'e gidin, bir rol bulun ve 'Başvur' düğmesine tıklayın." },
  "settings.faq2q": { en: "How do I get paid?", hi: "मुझे पेमेंट कैसे मिलेगा?", es: "¿Cómo me pagan?", fr: "Comment suis-je payé ?", de: "Wie werde ich bezahlt?", ja: "支払いはどうなりますか？", zh: "如何获得报酬？", ar: "كيف أحصل على الدفع؟", pt: "Como recebo o pagamento?", ko: "어떻게 급여를 받나요?", ru: "Как я получу оплату?", tr: "Nasıl ödeme alırım?" },
  "settings.faq2a": { en: "Payments are processed daily and deposited into your linked bank account or wallet. Check the Earnings tab for details.", hi: "भुगतान रोज़ाना प्रोसेस होता है और आपके लिंक किए गए बैंक अकाउंट या वॉलेट में जमा होता है। डिटेल्स के लिए Earnings टैब देखें।", es: "Los pagos se procesan diariamente en tu cuenta vinculada.", fr: "Les paiements sont traités quotidiennement sur votre compte.", de: "Zahlungen werden täglich auf Ihr verknüpftes Konto überwiesen.", ja: "支払いは毎日処理され、リンクされた口座に入金されます。", zh: "付款每天处理并存入您的关联账户。", ar: "تتم معالجة المدفوعات يومياً وإيداعها في حسابك.", pt: "Pagamentos são processados diariamente na sua conta vinculada.", ko: "급여는 매일 처리되어 연결된 계좌로 입금됩니다.", ru: "Выплаты обрабатываются ежедневно на ваш привязанный счёт.", tr: "Ödemeler günlük olarak bağlı hesabınıza yatırılır." },
  "settings.faq3q": { en: "Can I work on multiple roles?", hi: "क्या मैं एक से ज़्यादा भूमिका पर काम कर सकता हूं?", es: "¿Puedo trabajar en múltiples roles?", fr: "Puis-je travailler sur plusieurs rôles ?", de: "Kann ich an mehreren Rollen arbeiten?", ja: "複数の役割で働けますか？", zh: "可以同时做多个职位吗？", ar: "هل يمكنني العمل في أدوار متعددة؟", pt: "Posso trabalhar em vários papéis?", ko: "여러 역할에서 일할 수 있나요?", ru: "Могу ли я работать на нескольких ролях?", tr: "Birden fazla rolde çalışabilir miyim?" },
  "settings.faq3a": { en: "Yes! You can apply for and work on multiple roles simultaneously, as long as you can meet the required hours for each.", hi: "हां! आप एक साथ कई भूमिकाओं के लिए आवेदन कर सकते हैं और काम कर सकते हैं, बस हर एक के लिए ज़रूरी घंटे पूरे करें।", es: "¡Sí! Puedes trabajar en varios roles a la vez.", fr: "Oui ! Vous pouvez travailler sur plusieurs rôles.", de: "Ja! Sie können an mehreren Rollen gleichzeitig arbeiten.", ja: "はい！複数の役割で同時に働けます。", zh: "可以！只要满足每个职位的工时要求即可。", ar: "نعم! يمكنك العمل في أدوار متعددة في نفس الوقت.", pt: "Sim! Você pode trabalhar em várias funções simultaneamente.", ko: "네! 동시에 여러 역할에 지원하고 일할 수 있습니다.", ru: "Да! Можно работать на нескольких ролях одновременно.", tr: "Evet! Aynı anda birden fazla rolde çalışabilirsiniz." },
  "settings.faq4q": { en: "How does the referral program work?", hi: "रेफरल प्रोग्राम कैसे काम करता है?", es: "¿Cómo funciona el programa de referidos?", fr: "Comment fonctionne le parrainage ?", de: "Wie funktioniert das Empfehlungsprogramm?", ja: "紹介プログラムはどうなっていますか？", zh: "推荐计划如何运作？", ar: "كيف يعمل برنامج الإحالة؟", pt: "Como funciona o programa de indicação?", ko: "추천 프로그램은 어떻게 작동하나요?", ru: "Как работает реферальная программа?", tr: "Yönlendirme programı nasıl çalışır?" },
  "settings.faq4a": { en: "Share your referral link with friends. When they join and complete their first task, you earn a bonus. Check the Referrals tab for your link.", hi: "अपना रेफरल लिंक दोस्तों के साथ शेयर करें। जब वे जॉइन करके पहला टास्क पूरा करें, आपको बोनस मिलेगा। अपना लिंक Referrals टैब में देखें।", es: "Comparte tu enlace de referido y gana bonos.", fr: "Partagez votre lien de parrainage et gagnez un bonus.", de: "Teilen Sie Ihren Empfehlungslink und verdienen Sie einen Bonus.", ja: "紹介リンクを共有してボーナスを獲得しましょう。", zh: "分享推荐链接，好友完成首个任务后您将获得奖金。", ar: "شارك رابط الإحالة واحصل على مكافأة.", pt: "Compartilhe seu link de indicação e ganhe um bônus.", ko: "추천 링크를 공유하고 보너스를 받으세요.", ru: "Поделитесь реферальной ссылкой и получите бонус.", tr: "Yönlendirme bağlantınızı paylaşın ve bonus kazanın." },
  "settings.faq5q": { en: "Is my data secure?", hi: "क्या मेरा डेटा सुरक्षित है?", es: "¿Mis datos están seguros?", fr: "Mes données sont-elles sécurisées ?", de: "Sind meine Daten sicher?", ja: "データは安全ですか？", zh: "我的数据安全吗？", ar: "هل بياناتي آمنة؟", pt: "Meus dados estão seguros?", ko: "내 데이터는 안전한가요?", ru: "Мои данные в безопасности?", tr: "Verilerim güvende mi?" },
  "settings.faq5a": { en: "Absolutely. We use end-to-end encryption and never share your data with third parties. See our Privacy Policy for more details.", hi: "बिल्कुल। हम एंड-टू-एंड एन्क्रिप्शन का उपयोग करते हैं और आपका डेटा कभी तीसरे पक्ष के साथ शेयर नहीं करते। अधिक जानकारी के लिए हमारी प्राइवेसी पॉलिसी देखें।", es: "Sí, usamos cifrado de extremo a extremo.", fr: "Absolument. Nous utilisons un chiffrement de bout en bout.", de: "Absolut. Wir verwenden Ende-zu-Ende-Verschlüsselung.", ja: "はい、エンドツーエンド暗号化を使用しています。", zh: "当然，我们使用端到端加密保护您的数据。", ar: "بالتأكيد. نستخدم التشفير من طرف إلى طرف.", pt: "Com certeza. Usamos criptografia ponta a ponta.", ko: "물론입니다. 엔드투엔드 암호화를 사용합니다.", ru: "Абсолютно. Мы используем сквозное шифрование.", tr: "Kesinlikle. Uçtan uca şifreleme kullanıyoruz." },
  "settings.faq6q": { en: "How do I delete my account?", hi: "मैं अपना अकाउंट कैसे डिलीट करूं?", es: "¿Cómo elimino mi cuenta?", fr: "Comment supprimer mon compte ?", de: "Wie lösche ich mein Konto?", ja: "アカウントを削除するには？", zh: "如何删除我的账户？", ar: "كيف أحذف حسابي؟", pt: "Como excluir minha conta?", ko: "계정을 어떻게 삭제하나요?", ru: "Как удалить аккаунт?", tr: "Hesabımı nasıl silerim?" },
  "settings.faq6a": { en: "Scroll down to the Danger Zone in Settings and tap 'Delete Account'. This action is permanent and cannot be undone.", hi: "Settings में नीचे Danger Zone तक स्क्रॉल करें और 'Delete Account' पर टैप करें। यह कार्रवाई स्थायी है और इसे पूर्ववत नहीं किया जा सकता।", es: "Ve a la Zona de peligro en Configuración.", fr: "Allez dans la Zone de danger dans Paramètres.", de: "Scrollen Sie zur Gefahrenzone in den Einstellungen.", ja: "設定の危険ゾーンまでスクロールしてください。", zh: "在设置中向下滚动到危险区域。", ar: "انتقل إلى منطقة الخطر في الإعدادات.", pt: "Vá até a Zona de Perigo nas Configurações.", ko: "설정에서 위험 구역까지 스크롤하세요.", ru: "Прокрутите до Опасной зоны в Настройках.", tr: "Ayarlarda Tehlike Bölgesi'ne gidin." },
  "settings.stillNeedHelp": { en: "Still need help? Reach out to us:", hi: "अभी भी मदद चाहिए? हमसे संपर्क करें:", es: "¿Aún necesitas ayuda?", fr: "Besoin d'aide ?", de: "Noch Hilfe nötig?", ja: "まだ助けが必要ですか？", zh: "还需要帮助？", ar: "هل تحتاج مزيد من المساعدة؟", pt: "Ainda precisa de ajuda?", ko: "아직 도움이 필요하신가요?", ru: "Ещё нужна помощь?", tr: "Hâlâ yardıma mı ihtiyacınız var?" },
  "settings.supportHours": { en: "Available Mon–Sat, 9 AM – 6 PM IST", hi: "उपलब्ध सोम–शनि, सुबह 9 – शाम 6 IST", es: "Lun–Sáb, 9–18 IST", fr: "Lun–Sam, 9h–18h IST", de: "Mo–Sa, 9–18 Uhr IST", ja: "月〜土 9:00–18:00 IST", zh: "周一至周六 9AM–6PM IST", ar: "الإثنين–السبت، 9 ص – 6 م IST", pt: "Seg–Sáb, 9h–18h IST", ko: "월–토, 오전 9시–오후 6시 IST", ru: "Пн–Сб, 9:00–18:00 IST", tr: "Pzt–Cmt, 09:00–18:00 IST" },
};

interface LangContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const defaultT = (key: string): string => {
  return translations[key]?.["en"] || key;
};

const LangContext = createContext<LangContextType>({
  lang: "en",
  setLang: () => {},
  t: defaultT,
});

export const LangProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState<Lang>("en");

  const t = (key: string): string => {
    return translations[key]?.[lang] || translations[key]?.["en"] || key;
  };

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
};

export const useLang = () => useContext(LangContext);

export type { Lang };
