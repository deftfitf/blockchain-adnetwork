package jp.deftfitf.adnetwork.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class HomeController {

  @GetMapping("/")
  public String index() {
    return "index";
  }

  @GetMapping("/api/loginNeeded")
  public String loginNeeded() {
    return "index";
  }

}
