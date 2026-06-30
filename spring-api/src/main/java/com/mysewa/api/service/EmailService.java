package com.mysewa.api.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.math.BigDecimal;
import java.time.Year;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StreamUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private static final String VERIFY_TEMPLATE = "templates/email/verify-email.html";
    private static final String RESET_TEMPLATE = "templates/email/reset-password.html";

    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    @Value("${app.mail.from:no-reply@mysewa.local}")
    private String fromEmail;

    @Value("${app.mail.support:support@mysewa.com}")
    private String supportEmail;

    @Value("${app.mail.verification-expiry-hours:24}")
    private int verificationExpiryHours;

    @Value("${app.mail.password-reset-expiry-minutes:30}")
    private int passwordResetExpiryMinutes;

    public EmailService(ObjectProvider<JavaMailSender> mailSenderProvider) {
        this.mailSenderProvider = mailSenderProvider;
    }

    public void sendVerificationEmail(String to, String userName, String verificationUrl) {
        String displayName = userName == null || userName.isBlank() ? "there" : userName.trim();
        String html = renderTemplate(
                VERIFY_TEMPLATE,
                escapeHtml(displayName),
                verificationUrl,
                String.valueOf(verificationExpiryHours),
                supportEmail,
                String.valueOf(Year.now().getValue())
        );
        String plainText = buildVerificationPlainText(displayName, verificationUrl);
        sendHtmlEmail(to, "Verify your MySewa account", html, plainText);
    }

    public void sendPasswordResetEmail(String to, String userName, String resetUrl) {
        String displayName = userName == null || userName.isBlank() ? "there" : userName.trim();
        String html = renderResetTemplate(
                escapeHtml(displayName),
                resetUrl,
                String.valueOf(passwordResetExpiryMinutes),
                supportEmail,
                String.valueOf(Year.now().getValue())
        );
        String plainText = buildPasswordResetPlainText(displayName, resetUrl);
        sendHtmlEmail(to, "Reset your MySewa password", html, plainText);
    }

    public void sendBookingApprovedEmail(
            String to,
            String userName,
            String propertyName,
            BigDecimal depositAmount,
            String bookingsUrl
    ) {
        String displayName = userName == null || userName.isBlank() ? "there" : userName.trim();
        String property = propertyName == null || propertyName.isBlank() ? "your chosen property" : propertyName.trim();
        String deposit = depositAmount == null
                ? "the required amount"
                : "RM " + depositAmount.setScale(2, java.math.RoundingMode.HALF_UP);
        String payUrl = bookingsUrl == null || bookingsUrl.isBlank()
                ? "#"
                : bookingsUrl.trim();

        String html = "<!DOCTYPE html><html><body style=\"font-family:Arial,sans-serif;color:#1A1A2E;line-height:1.5;\">"
                + "<p>Hi " + escapeHtml(displayName) + ",</p>"
                + "<p>Great news — your booking for <strong>" + escapeHtml(property) + "</strong> has been approved!</p>"
                + "<p>Please pay your security deposit of <strong>" + escapeHtml(deposit) + "</strong> to confirm your booking.</p>"
                + "<p>You can pay via bank transfer, DuitNow QR, or ToyyibPay from <strong>My Bookings</strong> in your student dashboard.</p>"
                + "<p><a href=\"" + payUrl + "\" style=\"display:inline-block;background:#6C2BD9;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;\">Pay deposit in MySewa</a></p>"
                + "<p>Questions? Contact " + escapeHtml(supportEmail) + "</p>"
                + "<p>— MySewa Team</p></body></html>";

        String plainText = "Hi " + displayName + ",\n\n"
                + "Your booking for " + property + " has been approved!\n\n"
                + "Pay your security deposit (" + deposit + ") to confirm. Open My Bookings: " + payUrl + "\n\n"
                + "Payment methods: bank transfer, DuitNow QR, or ToyyibPay.\n\n"
                + "Questions? Contact " + supportEmail + "\n\n"
                + "— MySewa Team";

        sendHtmlEmail(to, "Your MySewa booking has been approved!", html, plainText);
    }

    private String renderResetTemplate(
            String userName,
            String resetUrl,
            String expiryMinutes,
            String support,
            String year
    ) {
        String template = loadTemplate(RESET_TEMPLATE);
        return template
                .replace("{{userName}}", userName)
                .replace("{{resetUrl}}", resetUrl)
                .replace("{{expiryMinutes}}", expiryMinutes)
                .replace("{{supportEmail}}", escapeHtml(support))
                .replace("{{year}}", year);
    }

    private String renderTemplate(
            String classpath,
            String userName,
            String verificationUrl,
            String expiryHours,
            String support,
            String year
    ) {
        String template = loadTemplate(classpath);
        return template
                .replace("{{userName}}", userName)
                .replace("{{verificationUrl}}", verificationUrl)
                .replace("{{expiryHours}}", expiryHours)
                .replace("{{supportEmail}}", escapeHtml(support))
                .replace("{{year}}", year);
    }

    private String loadTemplate(String classpath) {
        try {
            ClassPathResource resource = new ClassPathResource(classpath);
            try (InputStream in = resource.getInputStream()) {
                return StreamUtils.copyToString(in, StandardCharsets.UTF_8);
            }
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to load email template: " + classpath, ex);
        }
    }

    private void sendHtmlEmail(String to, String subject, String htmlBody, String plainText) {
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            log.warn("SMTP not configured — HTML email not sent to {} (subject: {})", to, subject);
            return;
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(plainText, htmlBody);
            mailSender.send(message);
        } catch (MessagingException ex) {
            log.error("Unable to send HTML email to {}: {}", to, ex.getMessage());
        }
    }

    private String buildVerificationPlainText(String userName, String verificationUrl) {
        return "Hi " + userName + ",\n\n"
                + "Welcome to MySewa! Please verify your email address to complete your registration.\n\n"
                + verificationUrl + "\n\n"
                + "This link will expire in " + verificationExpiryHours + " hours.\n\n"
                + "If you didn't create a MySewa account, you can ignore this email.\n\n"
                + "Questions? Contact " + supportEmail + "\n\n"
                + "— MySewa Team";
    }

    private String buildPasswordResetPlainText(String userName, String resetUrl) {
        return "Hi " + userName + ",\n\n"
                + "We received a request to reset your password for your MySewa account.\n\n"
                + "If you made this request, open this link to reset your password:\n"
                + resetUrl + "\n\n"
                + "This link will expire in " + passwordResetExpiryMinutes + " minutes.\n\n"
                + "If you didn't request this password reset, you can safely ignore this email.\n\n"
                + "Questions? Contact " + supportEmail + "\n\n"
                + "— MySewa Team";
    }

    private static String escapeHtml(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
