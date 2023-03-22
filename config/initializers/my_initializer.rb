class Object

  def console_log *args
    args.each do |arg|
      Rails.logger.info "*** #{arg.inspect} ***"
    end

    nil
  end

end