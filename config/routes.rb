Rails.application.routes.draw do
  # devise_scope :user do
  #   root to: "users/sessions#new"
  # end
  
  # devise_for :users, controllers: { 
  #   registrations:  'users/registrations',
  #   sessions:  'users/sessions'
  # }

  # root  'users#home'
  root 'users/sessions#new'
  get   'users', to: 'users#dashboard', as: :dashboard
  post  'users', to: 'users#dashboard', as: :user
  get   'logout', to: 'users#logout', as: :logout

  # get '/cubes', to: 'cubes#cube'
  get '/cubes/room', to: 'cubes#room'
  get '/fetch_html', to: 'users/rooms#fetch_html'
  get '/verify_image_url', to: 'users/rooms#verify_image_url'

  resources :users, path: 'accounts', only: [] do
    collection do
      get :profile
      get 'profile/:user_id', to: 'users#show'
      get 'edit/profile', to: "users#edit"
      get :cubes
      get :get_country_code
    end
  end

  namespace :users, path: 'accounts' do
    match 'sign_in', to: 'sessions#new', via: :get
    match 'sign_up', to: 'registrations#new', via: :get

    resources :registrations, path: '', only: [] do
      collection do
        post  :profile
        get   :forgot_password
      end
    end

    resources :rooms, path: '', only: :[] do
      collection do 
        get :team_room
        match 'cubes/:cube_id', to: 'rooms#first_room', via: :get
      end
    end
  end

  namespace :a_frames do
    get :frame_test
    get :test_frame_list
  end
end
