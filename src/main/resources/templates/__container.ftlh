<#ftl strip_whitespace=true>
<#macro main title>
  <!DOCTYPE html>
  <html xmlns="http://www.w3.org/1999/xhtml" lang="ja">
  <head>
    <title>Blockchain AdNetwork - ${title}</title>
    <script src="https://cdn.jsdelivr.net/npm/web3@1.7.0/dist/web3.min.js"></script>
  </head>
  <body>
  <div class="container">
  <#nested/>
  </div>
  </body>
  </html>

</#macro>