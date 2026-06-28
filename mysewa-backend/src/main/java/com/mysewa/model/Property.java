package com.mysewa.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "properties")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Property {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "landlord_id")
    private User landlord;

    private String name;

    @Column(length = 100)
    private String type;

    private String location;

    private String campus;

    private String distance;

    private Double latitude;

    private Double longitude;

    @Column(length = 100)
    private String city;

    @Column(length = 100)
    private String state;

    private String postcode;

    @Column(name = "rental_style", length = 100)
    private String rentalStyle;

    @Column(name = "accepts_married_household")
    @Builder.Default
    private Boolean acceptsMarriedHousehold = false;

    private String gender;

    private String religion;

    private String race;

    @Column(precision = 10, scale = 2)
    private BigDecimal price;

    private Integer capacity;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String amenities;

    /** JSON array of relative image paths stored as text. */
    @Column(columnDefinition = "TEXT")
    private String images;

    @Column(length = 50)
    @Builder.Default
    private String status = "available";

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
