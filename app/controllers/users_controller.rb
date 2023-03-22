class UsersController < ApplicationController
  layout "users"
  def dashboard
  end

  def profile
  end

  def edit
  end

  def cubes
  end

  def logout
    redirect_to new_user_registration_path
  end

  def home
  end

  def show
    render template: "users/profile"
  end

  def get_country_code
    c = ISO3166::Country.find_country_by_name(params[:country])
    return render json: { country_code: c.present? ? c.country_code : '' }
  end
end
