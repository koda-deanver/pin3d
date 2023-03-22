class Users::RoomsController < UsersController
  require "net/http"
  require "uri"
  require "base64"

  # layout "users"

  def first_room
  end

  def team_room
    
  end

  def verify_image_url
    uri = URI(params[:url])
    res = Net::HTTP.get_response(uri)
    render json: { response: res.message }
  end

  def fetch_html
    url = params[:url].split(' ').compact.join("%20")
    url = validate_url url
    url = [url, ['oe', params[:oe]].join("=")].join("&") if params[:oe].present?
    url = url.split('?').first if url.include? 'ref_src'
    uri = URI.parse(url)
    # uri.host = ['www', uri.host].join('.') unless uri.host.to_s.include? 'www' if url.match(/.*\bgoogle.com\b.*/)
    # logger.info "====host\n#{uri.host}\n===="
    uri.host = uri.host.downcase
    success = true
    if url.match(/(.*\bdropbox.com\b.*\bpreview\b)/)
      path = params[:url].gsub(/\b\?preview=\b/, '/')
      path = path.gsub [uri.scheme, uri.host].join('://') + '/home', ''
      result = with_dropbox_authoriztion(path)
      if result['dropbox-api-result'].present?
        img_src =  "data:#{result['content-type']};base64,"
        img_src += Base64.encode64(result.body)
        n_html_body = '<img src="' + img_src + '">'
      else
        n_html_body = ''
        success = false
      end
    else
      isImg = url.match(/(.jpg|.png|.gif)/)
      if isImg
        extension = case params[:url]
        when (/(.gif)/) then "gif"
        when (/(.jpg)/) then 'jpg'
        when (/(.png)/) then 'png'
        end
        img_src =  'data:image/' + extension + ';base64,' 
        img_src += Base64.encode64(trail_redirects(uri, 5))
        # logger.info "====img\n#{img}\n===="
        n_html_body = '<img src="' + img_src + '">'
      else
        n_html_body = trail_redirects(uri, 5)
        success = false unless n_html_body.present?
      end
    end

    n_html_body += '<img class="mod-url" data-url="' + url + '">'

    if success
      render html: n_html_body.html_safe
    else
      render html: n_html_body.html_safe, status: 300
    end
  end


  private
    def validate_url url
      scheme, host = url.split('://')
      unless host.present?
        host = scheme
        scheme = "http"
      end
      scheme = "http" if scheme.blank?

      host_path = host.split('/')
      while ['/', ':', ':/',''].include? host_path[0]
        host_path.delete_at 0
      end

      split_host = host_path[0].split('.')
      if split_host.count < 3 && !split_host.first.match(/(www)/)
        split_host.insert(0, 'www') 
        host_path[0] = split_host.join('.')
      end

      logger.info "======new url:      #{[scheme, host_path.join('/')].join('://')}\n"
      return [scheme, host_path.join('/')].join('://')
    end

    def trail_redirects uri_str, limit=0 
      raise ArgumentError, 'too many HTTP redirects' if limit == 0
      # response = Net::HTTP.get_response(URI(uri_str))
      uri = URI.parse(uri_str.to_s)
      http = Net::HTTP.new(uri.host, uri.port)
      if uri.scheme.to_s.include? 'https'
        http.use_ssl = true
      end
      # request = Net::HTTP::Get.new(uri.request_uri)
      request = Net::HTTP::Get.new(URI(uri.to_s))

      request['Accept-Language'] = 'en-US'
      response = http.request(request)

      case response
      when Net::HTTPSuccess then
        return response.body
      when Net::HTTPRedirection then
        logger.info response
        location = response['location']
        warn "redirected to #{location}"
        logger.info "====redirected\n#{location}\n===="

        resp_uri = URI.parse(location)
        unless resp_uri.host then
          location = "#{uri.scheme}://#{uri.host}/#{location}"
        end
        trail_redirects(location, limit - 1)
      else
        return response.body
      end
    end

    def with_dropbox_authoriztion path
      uri = URI.parse("https://content.dropboxapi.com/2/files/get_thumbnail")
      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = true
      
      request = Net::HTTP::Post.new(uri.request_uri)
      request['User-Agent'] = 'api-explorer-client'
      request['Authorization'] = "Bearer J29zVYHTzkUAAAAAAAABYkyvRgay7bQy5hosmXZHaU0FVQDoPsBMOXeQ2pcLy1bT"
      size = {'.tag': 'w640h480'}
      request['Dropbox-API-Arg'] = { path: path, format: 'png', size: size }.to_json
      request.content_type = "text/plain"
      response = http.request(request)
      return response
    end
end
