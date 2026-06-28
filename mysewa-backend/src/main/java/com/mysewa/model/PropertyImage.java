package com.mysewa.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** DTO helper for property image paths parsed from the {@code properties.images} JSON column. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PropertyImage {

    private String path;

    private String url;

    private Integer sortOrder;
}
