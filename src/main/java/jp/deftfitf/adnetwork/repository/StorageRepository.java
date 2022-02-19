package jp.deftfitf.adnetwork.repository;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import javax.annotation.PostConstruct;
import org.apache.tomcat.util.http.fileupload.IOUtils;
import org.springframework.stereotype.Repository;

@Repository
public class StorageRepository {

  private static final String BASE_DIRECTORY = "./uploaded";

  @PostConstruct
  public void init() {
    createDirectorySilently(Paths.get(BASE_DIRECTORY + "/images"));
    createDirectorySilently(Paths.get(BASE_DIRECTORY + "/ad-formats"));
  }

  private void createDirectorySilently(Path directoryPath) {
    try {
      if (Files.exists(directoryPath)) {
        return;
      }
      Files.createDirectory(directoryPath);
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
  }

  public void save(String fileName, InputStream inputStream) {
    final Path path;
    try {
      path = Files.createFile(Paths.get(BASE_DIRECTORY, fileName));
    } catch (IOException e) {
      throw new RuntimeException(e);
    }

    try (final var os = Files.newOutputStream(path)) {
      IOUtils.copy(inputStream, os);
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
  }

  public String load(String fileName) {
    try {
      return Files.readString(Paths.get(BASE_DIRECTORY, fileName));
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
  }

  public void delete(String fileName) {
    try {
      Files.deleteIfExists(Paths.get(BASE_DIRECTORY, fileName));
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
  }

}
