#! /usr/bin/env bash

# Variables
HOST=infinitum.dev
DBHOST=localhost
DBNAME=infinitum
DBUSER=infinitum
DBPASSWD=infinitum

echo -e "\n> Starting installation...\n"

echo -e "\n> Updating packages list...\n"
apt-get -qq update

echo -e "\n> Install base packages...\n"
apt-get -y install vim curl build-essential python-software-properties git > /dev/null 2>&1

echo -e "\n> Add some repos to update our distro...\n"
add-apt-repository ppa:ondrej/php > /dev/null 2>&1

echo -e "\n> Updating packages list...\n"
apt-get -qq update

echo -e "\n> Install MySQL specific packages and settings...\n"
echo "mysql-server mysql-server/root_password password $DBPASSWD" | debconf-set-selections
echo "mysql-server mysql-server/root_password_again password $DBPASSWD" | debconf-set-selections
apt-get -y install mysql-server > /dev/null 2>&1

echo -e "\n> Setting up our MySQL user and db...\n"
mysql -uroot -p$DBPASSWD -e "CREATE DATABASE $DBNAME"
mysql -uroot -p$DBPASSWD -e "GRANT ALL PRIVILEGES ON $DBNAME.* TO '$DBUSER'@'localhost' IDENTIFIED BY '$DBPASSWD'"

echo -e "\n> Installing apache and php...\n"
apt-get -y install php7.0 apache2 php7.0-mysql php7.0-dev > /dev/null 2>&1

echo -e "\n> Enabling mod-rewrite...\n"
a2enmod rewrite > /dev/null 2>&1

echo -e "\n> Allowing Apache override to all...\n"
sed -i "s/AllowOverride None/AllowOverride All/g" /etc/apache2/apache2.conf

echo -e "\n> Disabling apache file indexes...\n"
sed -i "s/Options Indexes/Options/g" /etc/apache2/apache2.conf

echo -e "\n> Turning on php error reporting...\n"
sed -i "s/error_reporting = .*/error_reporting = E_ALL/" /etc/php/7.0/apache2/php.ini
sed -i "s/display_errors = .*/display_errors = On/" /etc/php/7.0/apache2/php.ini

echo -e "\n> Set up default domain in Apache...\n"
rm /etc/apache2/sites-enabled/000-default.conf > /dev/null 2>&1
touch /etc/apache2/sites-available/$HOST.conf > /dev/null 2>&1
cat > /etc/apache2/sites-available/$HOST.conf <<EOF
<VirtualHost *:80>
    DocumentRoot /var/www/test
    ErrorLog \${APACHE_LOG_DIR}/error.log
    CustomLog \${APACHE_LOG_DIR}/access.log combined
</VirtualHost>
EOF
ln -fs /etc/apache2/sites-available/$HOST.conf /etc/apache2/sites-enabled/$HOST.conf > /dev/null 2>&1

echo -e "\n> Removing default html folder from web root...\n"
rm -rf /var/www/html > /dev/null 2>&1

echo -e "\n> Restarting Apache...\n"
service apache2 restart > /dev/null 2>&1

echo -e "\n> Installing Composer...\n"
curl --silent https://getcomposer.org/installer | php > /dev/null 2>&1
mv composer.phar /usr/local/bin/composer

echo -e "\n> Installing NodeJS and NPM...\n"
curl -sL https://deb.nodesource.com/setup_5.x | sudo -E bash - > /dev/null 2>&1
apt-get -y install nodejs > /dev/null 2>&1

echo -e "\n> Installing gulp and bower...\n"
npm install -g gulp bower > /dev/null 2>&1

echo -e "\n> Setting hostname...\n"
hostname $HOST > /dev/null 2>&1
cat > /etc/hostname <<EOL
$HOST
EOL
/etc/init.d/hostname.sh start > /dev/null 2>&1

echo -e "\n> Installing xdebug...\n"
cd /home
mkdir tmp > /dev/null 2>&1
cd tmp
wget http://xdebug.org/files/xdebug-2.4.0rc4.tgz > /dev/null 2>&1
tar -xvzf xdebug-2.4.0rc4.tgz > /dev/null 2>&1
cd xdebug-2.4.0RC4
/usr/bin/phpize > /dev/null 2>&1
./configure --enable-xdebug --with-php-config=/usr/bin/php-config > /dev/null 2>&1
make > /dev/null 2>&1
make test > /dev/null 2>&1
cp modules/xdebug.so /usr/lib/php/20151012/ > /dev/null 2>&1
cat > /etc/php/7.0/apache2/conf.d/20-xdebug.ini <<EOL
[xdebug]
zend_extension=/usr/lib/php/20151012/xdebug.so

xdebug.remote_enable = 1
xdebug.remote_connect_back = 1
xdebug.remote_port = 9000
xdebug.scream = 0 
xdebug.cli_color = 1
xdebug.show_local_vars = 1
EOL
rm -rf /home/tmp > /dev/null 2>&1

echo -e "\n> Restarting Apache...\n"
service apache2 restart > /dev/null 2>&1