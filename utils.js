function getOriginFromUri(uri) {
  var origin = uri.protocol + "://" + uri.authority;
  if (uri.port) 
    origin += ":" + uri.port;
  return origin;
}
