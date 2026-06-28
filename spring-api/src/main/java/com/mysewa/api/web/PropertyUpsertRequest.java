package com.mysewa.api.web;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.springframework.util.StringUtils;

@JsonIgnoreProperties(ignoreUnknown = true)
public class PropertyUpsertRequest {

    private static final ObjectMapper JSON = new ObjectMapper();
    private Integer landlordId;
    private String name;
    private String type;
    private String location;
    private String campus;
    private String distance;
    private Double latitude;
    private Double longitude;
    private String city;
    private String state;
    private String postcode;
    private String rentalStyle;
    private Boolean acceptsMarriedHousehold;
    private String gender;
    private String religion;
    private String race;
    private Double price;
    private Integer capacity;
    private String description;
    private String amenities;
    private String images;
    private String status;
    private String contactPhone;
    private String contactEmail;
    private String whatsappNumber;
    private List<String> paymentMethods;
    private String paymentDueDate;
    private String bankName;
    private String accountNumber;
    private String accountHolder;
    private String qrCodeUrl;

    public Integer getLandlordId() {
        return landlordId;
    }

    public void setLandlordId(Integer landlordId) {
        this.landlordId = landlordId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getCampus() {
        return campus;
    }

    public void setCampus(String campus) {
        this.campus = campus;
    }

    public String getDistance() {
        return distance;
    }

    public void setDistance(String distance) {
        this.distance = distance;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getState() {
        return state;
    }

    public void setState(String state) {
        this.state = state;
    }

    public String getPostcode() {
        return postcode;
    }

    public void setPostcode(String postcode) {
        this.postcode = postcode;
    }

    public String getRentalStyle() {
        return rentalStyle;
    }

    public void setRentalStyle(String rentalStyle) {
        this.rentalStyle = rentalStyle;
    }

    public Boolean getAcceptsMarriedHousehold() {
        return acceptsMarriedHousehold;
    }

    public void setAcceptsMarriedHousehold(Boolean acceptsMarriedHousehold) {
        this.acceptsMarriedHousehold = acceptsMarriedHousehold;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public String getReligion() {
        return religion;
    }

    public void setReligion(String religion) {
        this.religion = religion;
    }

    public String getRace() {
        return race;
    }

    public void setRace(String race) {
        this.race = race;
    }

    public Double getPrice() {
        return price;
    }

    public void setPrice(Double price) {
        this.price = price;
    }

    public Integer getCapacity() {
        return capacity;
    }

    public void setCapacity(Integer capacity) {
        this.capacity = capacity;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getAmenities() {
        return amenities;
    }

    public void setAmenities(String amenities) {
        this.amenities = amenities;
    }

    public String getImages() {
        return images;
    }

    public void setImages(String images) {
        this.images = images;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getContactPhone() {
        return contactPhone;
    }

    public void setContactPhone(String contactPhone) {
        this.contactPhone = contactPhone;
    }

    public String getContactEmail() {
        return contactEmail;
    }

    public void setContactEmail(String contactEmail) {
        this.contactEmail = contactEmail;
    }

    public String getWhatsappNumber() {
        return whatsappNumber;
    }

    public void setWhatsappNumber(String whatsappNumber) {
        this.whatsappNumber = whatsappNumber;
    }

    public List<String> getPaymentMethods() {
        return paymentMethods;
    }

    public void setPaymentMethods(List<String> paymentMethods) {
        this.paymentMethods = paymentMethods;
    }

    @JsonSetter("paymentMethods")
    public void setPaymentMethodsFromJson(Object value) {
        if (value == null) {
            this.paymentMethods = null;
            return;
        }
        if (value instanceof List<?> list) {
            List<String> next = new ArrayList<>();
            for (Object item : list) {
                if (item != null && StringUtils.hasText(String.valueOf(item))) {
                    next.add(String.valueOf(item).trim());
                }
            }
            this.paymentMethods = next;
            return;
        }
        String raw = String.valueOf(value).trim();
        if (!StringUtils.hasText(raw)) {
            this.paymentMethods = null;
            return;
        }
        if (raw.startsWith("[")) {
            try {
                List<String> parsed = JSON.readValue(raw, new TypeReference<List<String>>() {});
                this.paymentMethods = parsed != null ? parsed : Collections.emptyList();
            } catch (Exception ignored) {
                this.paymentMethods = Collections.emptyList();
            }
            return;
        }
        this.paymentMethods = List.of(raw);
    }

    public String getPaymentDueDate() {
        return paymentDueDate;
    }

    public void setPaymentDueDate(String paymentDueDate) {
        this.paymentDueDate = paymentDueDate;
    }

    public String getBankName() {
        return bankName;
    }

    public void setBankName(String bankName) {
        this.bankName = bankName;
    }

    public String getAccountNumber() {
        return accountNumber;
    }

    public void setAccountNumber(String accountNumber) {
        this.accountNumber = accountNumber;
    }

    public String getAccountHolder() {
        return accountHolder;
    }

    public void setAccountHolder(String accountHolder) {
        this.accountHolder = accountHolder;
    }

    public String getQrCodeUrl() {
        return qrCodeUrl;
    }

    public void setQrCodeUrl(String qrCodeUrl) {
        this.qrCodeUrl = qrCodeUrl;
    }
}
