package com.mysewa.api.service;

import com.mysewa.api.domain.UniversityEntity;
import com.mysewa.api.repo.UniversityRepository;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class CampusProximityService {

    private final UniversityRepository universityRepository;

    public CampusProximityService(UniversityRepository universityRepository) {
        this.universityRepository = universityRepository;
    }

    public List<UniversityEntity> listActivePinned() {
        return universityRepository.findByActiveTrueOrderBySortOrderAscCodeAsc().stream()
                .filter(u -> u.getLatitude() != null && u.getLongitude() != null)
                .collect(java.util.stream.Collectors.toList());
    }

    public Map<String, String> resolveFromCoordinates(Double latitude, Double longitude) {
        if (latitude == null || longitude == null) {
            return new HashMap<>();
        }
        List<UniversityEntity> campuses = listActivePinned();
        if (campuses.isEmpty()) {
            return new HashMap<>();
        }

        UniversityEntity nearest = campuses.get(0);
        double nearestKm = distanceKm(latitude, longitude, nearest.getLatitude(), nearest.getLongitude());

        for (int i = 1; i < campuses.size(); i++) {
            UniversityEntity c = campuses.get(i);
            double km = distanceKm(latitude, longitude, c.getLatitude(), c.getLongitude());
            if (km < nearestKm) {
                nearest = c;
                nearestKm = km;
            }
        }

        String distance = formatDistance(nearestKm) + " from " + nearest.getCode();
        Map<String, String> out = new HashMap<>();
        out.put("campus", nearest.getCode());
        out.put("distance", distance);
        return out;
    }

    private static double distanceKm(double lat1, double lng1, double lat2, double lng2) {
        double r = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private static String formatDistance(double km) {
        if (km < 1) {
            return String.format(Locale.US, "%d m", Math.round(km * 1000));
        }
        return String.format(Locale.US, "%.1f km", km);
    }
}
