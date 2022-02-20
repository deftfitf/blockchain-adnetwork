package jp.deftfitf.adnetwork.controller;

import jp.deftfitf.adnetwork.auth.EthAuthenticationToken.EthUserPrincipal;
import jp.deftfitf.adnetwork.interfaces.ChallengeRequest;
import jp.deftfitf.adnetwork.interfaces.ChallengeResponse;
import jp.deftfitf.adnetwork.repository.ChallengeRepository;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class EthUserController {

  @NonNull
  private final ChallengeRepository sessionRepository;

  @PostMapping("/login/challenge")
  public ChallengeResponse challenge(
      @RequestBody ChallengeRequest challengeRequest
  ) {
    return new ChallengeResponse(sessionRepository.attempt(challengeRequest.getAddress()));
  }

  @PostMapping("/login")
  public void login() {
  }

  @PostMapping("/login/check")
  public EthUserPrincipal loginCheck(@AuthenticationPrincipal EthUserPrincipal user) {
    return user;
  }

}
