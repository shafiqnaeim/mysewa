package com.mysewa.api.service;

import com.mysewa.api.repo.PropertyRepository;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class AdminService {

    private final PropertyRepository propertyRepository;

    public AdminService(PropertyRepository propertyRepository) {
        this.propertyRepository = propertyRepository;
    }

    /**
     * Counts properties grouped by {@code type} (House, Room).
     */
    public Map<String, Long> countPropertiesByType() {
        Map<String, Long> counts = new LinkedHashMap<>();
        counts.put("House", 0L);
        counts.put("Room", 0L);

        List<Object[]> rows = propertyRepository.countGroupByType();
        for (Object[] row : rows) {
            if (row == null || row.length < 2) {
                continue;
            }
            String type = row[0] == null ? "" : row[0].toString().trim();
            long count = row[1] instanceof Number ? ((Number) row[1]).longValue() : 0L;
            if ("House".equalsIgnoreCase(type)) {
                counts.put("House", counts.get("House") + count);
            } else if ("Room".equalsIgnoreCase(type)) {
                counts.put("Room", counts.get("Room") + count);
            }
        }

        return counts;
    }
}
