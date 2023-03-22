module UsersHelper
  def open_link(cont, action)
    return 'open' if cont == controller_name && action == action_name
    return ''
  end
end
