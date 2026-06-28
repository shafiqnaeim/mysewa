package com.mysewa.util;

import com.mysewa.exception.BadRequestException;
import java.util.regex.Pattern;

public final class ValidationUtil {

    private static final Pattern PHONE = Pattern.compile("^\\+60\\d{2}-\\d{7,8}$");
    private static final Pattern IC = Pattern.compile("^\\d{6}-\\d{2}-\\d{4}$");

    private ValidationUtil() {
    }

    public static void requirePhone(String phone) {
        if (phone == null || !PHONE.matcher(phone.trim()).matches()) {
            throw new BadRequestException("Phone number must follow format +60xx-xxxxxxx");
        }
    }

    public static void requireIc(String ic) {
        if (ic == null || !IC.matcher(ic.trim()).matches()) {
            throw new BadRequestException("IC number must follow format 123456-78-9010");
        }
    }

    public static String normalizePhoneInput(String localPart) {
        if (localPart == null) {
            return null;
        }
        String digits = localPart.replaceAll("^\\+?60", "").trim();
        return "+60" + digits;
    }
}
