<#import "__container.ftlh" as container>
<@container.main "Spring Security Example">
  <#if error>
    <div>
      Invalid username and password.
    </div>
  </#if>
  <#if logout>
    <div>
      You have been logged out.
    </div>
  </#if>
<form action="/login" method="post">
  <div><label> User Name : <input type="text" name="username"/> </label></div>
  <div><label> Password: <input type="password" name="password"/> </label></div>
  <div><input type="submit" value="Sign In"/></div>
</form>
</@container.main>
