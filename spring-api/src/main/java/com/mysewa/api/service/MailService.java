package com.mysewa.api.service;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class MailService {

    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    @Value("${app.mail.from:no-reply@mysewa.local}")
    private String fromEmail;

    public MailService(ObjectProvider<JavaMailSender> mailSenderProvider) {
        this.mailSenderProvider = mailSenderProvider;
    }

    public void sendEmail(String to, String subject, String body) {
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            // Local dev fallback when SMTP is not configured yet.
            System.out.println("MAIL_DEBUG to=" + to + " subject=" + subject + " body=" + body);
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
        } catch (Exception ex) {
            // Keeps local development unblocked if SMTP credentials are missing/invalid.
            System.out.println("MAIL_WARN Unable to send via SMTP: " + ex.getMessage());
            System.out.println("MAIL_DEBUG to=" + to + " subject=" + subject + " body=" + body);
        }
    }
}
