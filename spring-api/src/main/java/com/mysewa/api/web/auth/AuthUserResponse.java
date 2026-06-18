package com.mysewa.api.web.auth;



import com.mysewa.api.domain.UserAccount;

import com.mysewa.api.service.IcCryptoService;



public class AuthUserResponse {

    public Integer id;

    public String email;

    public String fullName;

    public String phoneNumber;

    public String icNumber;

    public String university;

    public Integer universityId;

    public String race;

    public String religion;

    public String role;

    public boolean isVerified;

    public String documentVerificationStatus;

    public String country;

    public String programStudy;

    public String academicYear;



    public static AuthUserResponse from(UserAccount user, IcCryptoService icCrypto) {

        AuthUserResponse response = new AuthUserResponse();

        response.id = user.getId();

        response.email = user.getEmail();

        response.fullName = user.getFullName();

        response.phoneNumber = user.getPhoneNumber();

        response.icNumber = icCrypto != null ? icCrypto.decryptForDisplay(user.getIcNumber()) : user.getIcNumber();

        response.university = user.getUniversity();

        response.universityId = user.getUniversityId();

        response.race = user.getRace();

        response.religion = user.getReligion();

        response.role = user.getRole();

        response.isVerified = user.isVerified();

        response.documentVerificationStatus = user.getDocumentVerificationStatus();

        response.country = user.getCountry();

        response.programStudy = user.getProgramStudy();

        response.academicYear = user.getAcademicYear();

        return response;

    }

}

