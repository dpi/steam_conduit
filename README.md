Steam Conduit

Copyright Daniel Phin (@dpi) 2015

REST server for a Steam client.

# License

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License version 2
as published by the Free Software Foundation.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, write to the Free Software
Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.

# Configuration

## Authentication

 1. Delete _sentry_ file if it exists from a previous run. Do not delete if you
    do not wish to re-initiate a new login session.
 2. Copy _config.json.defaults_ to _config.json_.
 3. Edit _config.json_, set __username__ and __password__.
 4. Run server. Server will error out. You should receive a Steam authentication
    code in your email inbox.
 5. Edit _config.json_, set __auth_code__ to the code you received.
 6. Run server, server should sign in to Steam.
 7. Edit _config.json_, remove __auth_code__.
 8. Server should launch again if it is relaunched because _sentry_ file is set.