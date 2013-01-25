function getOriginFromUri(uri) {
  var origin = uri.protocol + "://" + uri.authority;
  if (uri.port) 
    origin += ":" + uri.port;
  return origin;
}

function getOriginFromUrl(url) {
  var uri = parseUri(url);
  return getOriginFromUri(uri);
}
