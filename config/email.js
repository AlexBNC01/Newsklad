const nodemailer = require('nodemailer');

// Создаем транспорт для отправки email
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false, // true для 465, false для других портов
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Отправка кода подтверждения регистрации
const sendVerificationEmail = async (email, code, fullName) => {
  const mailOptions = {
    from: `"Skladreact App" <${process.env.SMTP_USER}>`,
    to: email,
    subject: '🔐 Подтверждение регистрации в Skladreact',
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Добро пожаловать в Skladreact! 🎉</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 18px; color: #333; margin-top: 0;">
            Привет, <strong>${fullName}</strong>!
          </p>
          
          <p style="color: #666; font-size: 16px;">
            Спасибо за регистрацию в нашем приложении для управления складом запчастей. 
            Для завершения регистрации введите код подтверждения в приложении:
          </p>
          
          <div style="text-align: center; margin: 40px 0;">
            <div style="display: inline-block; background: white; padding: 20px 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
              <span style="font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                ${code}
              </span>
            </div>
          </div>
          
          <p style="color: #ff6b6b; font-weight: 500; text-align: center; margin: 20px 0;">
            ⏰ Код действителен в течение 15 минут
          </p>
          
          <div style="background: white; padding: 25px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #4CAF50;">
            <h3 style="color: #333; margin-top: 0; font-size: 20px;">🚀 Что вас ждет в Skladreact:</h3>
            <ul style="color: #666; padding-left: 20px;">
              <li style="margin-bottom: 8px;">📦 <strong>Управление складом:</strong> Учет запчастей, контейнеры, штрих-коды</li>
              <li style="margin-bottom: 8px;">🔧 <strong>Ремонты техники:</strong> История работ, назначение персонала</li>
              <li style="margin-bottom: 8px;">📊 <strong>Отчеты:</strong> Красивые PDF отчеты и аналитика</li>
              <li style="margin-bottom: 8px;">👥 <strong>Команда:</strong> Неограниченное количество сотрудников</li>
              <li style="margin-bottom: 8px;">📱 <strong>Синхронизация:</strong> Данные обновляются мгновенно на всех устройствах</li>
            </ul>
          </div>
          
          <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
            <h4 style="color: #1976d2; margin: 0 0 10px 0;">💫 Полностью бесплатно!</h4>
            <p style="color: #666; margin: 0; font-size: 14px;">
              Без ограничений по функциям, пользователям или времени использования
            </p>
          </div>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>Если вы не регистрировались в Skladreact, просто проигнорируйте это письмо.</p>
          <p style="margin-top: 15px;">
            С уважением,<br>
            Команда Skladreact
          </p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${email}`);
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
};

// Отправка email для восстановления пароля
const sendPasswordResetEmail = async (email, resetToken, fullName) => {
  const resetUrl = `${process.env.APP_URL}/reset-password?token=${resetToken}`;
  
  const mailOptions = {
    from: `"Skladreact App" <${process.env.SMTP_USER}>`,
    to: email,
    subject: '🔑 Восстановление пароля - Skladreact',
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6;">
        <div style="background: #ff6b6b; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Восстановление пароля 🔑</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 18px; color: #333; margin-top: 0;">
            Привет, <strong>${fullName}</strong>!
          </p>
          
          <p style="color: #666; font-size: 16px;">
            Мы получили запрос на восстановление пароля для вашего аккаунта в Skladreact.
          </p>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${resetUrl}" style="display: inline-block; background: #ff6b6b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 16px;">
              Восстановить пароль
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; text-align: center;">
            Или скопируйте ссылку в браузер:<br>
            <span style="background: #e0e0e0; padding: 5px 10px; border-radius: 4px; font-family: monospace; word-break: break-all;">
              ${resetUrl}
            </span>
          </p>
          
          <p style="color: #ff6b6b; font-weight: 500; text-align: center; margin: 30px 0;">
            ⏰ Ссылка действительна в течение 1 часа
          </p>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #856404; margin: 0; font-size: 14px;">
              <strong>⚠️ Важно:</strong> Если вы не запрашивали восстановление пароля, просто проигнорируйте это письмо. Ваш пароль останется неизменным.
            </p>
          </div>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>
            С уважением,<br>
            Команда Skladreact
          </p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email}`);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  transporter
};