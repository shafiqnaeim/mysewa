package com.mysewa.api.config;

import com.mysewa.api.domain.UniversityEntity;
import com.mysewa.api.repo.UniversityRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Seeds default Terengganu campus rows when the {@code universities} table is empty.
 */
@Component
public class UniversityBootstrapRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(UniversityBootstrapRunner.class);

    private final UniversityRepository universityRepository;

    public UniversityBootstrapRunner(UniversityRepository universityRepository) {
        this.universityRepository = universityRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (universityRepository.count() > 0) {
            return;
        }
        seed("UMT", "Universiti Malaysia Terengganu (UMT)", 5.4084, 103.0821, 1);
        seed("UniSZA", "Universiti Sultan Zainal Abidin (UniSZA)", 5.3943, 103.1028, 2);
        seed("ILPKT", "Institut Latihan Perindustrian Kuala Terengganu (ILPKT)", 5.3294, 103.1406, 3);
        seed("IPGM", "Institut Pendidikan Guru Malaysia (IPGM)", 5.4012, 103.0889, 4);
        log.info("Seeded default universities table (4 campuses). Adjust pins in the admin dashboard.");
    }

    private void seed(String code, String name, double lat, double lng, int sortOrder) {
        UniversityEntity u = new UniversityEntity();
        u.setCode(code);
        u.setName(name);
        u.setLatitude(lat);
        u.setLongitude(lng);
        u.setCity("Kuala Terengganu");
        u.setState("Terengganu");
        u.setActive(true);
        u.setSortOrder(sortOrder);
        u.setUpdatedAt(LocalDateTime.now());
        universityRepository.save(u);
    }
}
