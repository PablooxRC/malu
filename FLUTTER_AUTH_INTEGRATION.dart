// FLUTTER - Servicio de Autenticación
// Instalar dependencias:
// flutter pub add flutter_secure_storage http

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class AuthService {
  final String baseUrl = 'http://tu-servidor.com/api'; // Cambiar la URL
  final _secureStorage = const FlutterSecureStorage();

  // Claves para el almacenamiento seguro
  static const String _tokenKey = 'auth_token'; //cambiar Keys si es necesario
  static const String _userKey = 'user_data';

  /// Login - Envía credenciales al servidor
  Future<Map<String, dynamic>> login(String username, String password) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/users/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'username': username,
          'password': password,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        
        // Guardar token de forma segura
        await _secureStorage.write(
          key: _tokenKey,
          value: data['token'],
        );

        // Guardar datos del usuario (sin info sensible)
        await _secureStorage.write(
          key: _userKey,
          value: jsonEncode(data['user']),
        );

        return {
          'success': true,
          'message': data['message'],
          'token': data['token'],
          'user': data['user'],
        };
      } else {
        final error = jsonDecode(response.body);
        return {
          'success': false,
          'message': error['message'] ?? 'Error en el login',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Error de conexión: $e',
      };
    }
  }

  /// Obtener token almacenado
  Future<String?> getToken() async {
    return await _secureStorage.read(key: _tokenKey);
  }

  /// Obtener datos del usuario almacenados
  Future<Map<String, dynamic>?> getUserData() async {
    final userData = await _secureStorage.read(key: _userKey);
    if (userData != null) {
      return jsonDecode(userData);
    }
    return null;
  }

  /// Obtener perfil del usuario (requiere token válido)
  Future<Map<String, dynamic>> getProfile() async {
    try {
      final token = await getToken();
      
      if (token == null) {
        return {
          'success': false,
          'message': 'No hay sesión activa',
        };
      }

      final response = await http.get(
        Uri.parse('$baseUrl/users/profile'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else if (response.statusCode == 401) {
        // Token expirado o inválido
        await logout();
        return {
          'success': false,
          'message': 'Sesión expirada. Inicia sesión nuevamente.',
        };
      } else {
        return jsonDecode(response.body);
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Error de conexión: $e',
      };
    }
  }

  /// Logout - Eliminar token y datos del usuario
  Future<void> logout() async {
    await _secureStorage.delete(key: _tokenKey);
    await _secureStorage.delete(key: _userKey);
  }

  /// Verificar si hay sesión activa
  Future<bool> isAuthenticated() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }

  /// Realizar request autenticado genérico
  Future<http.Response> authenticatedRequest({
    required String method,
    required String endpoint,
    Map<String, dynamic>? body,
  }) async {
    final token = await getToken();

    if (token == null) {
      throw Exception('No hay sesión activa');
    }

    final headers = {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
    };

    final uri = Uri.parse('$baseUrl$endpoint');

    late http.Response response;

    switch (method.toUpperCase()) {
      case 'GET':
        response = await http.get(uri, headers: headers);
        break;
      case 'POST':
        response = await http.post(uri, headers: headers, body: jsonEncode(body));
        break;
      case 'PUT':
        response = await http.put(uri, headers: headers, body: jsonEncode(body));
        break;
      case 'DELETE':
        response = await http.delete(uri, headers: headers);
        break;
      default:
        throw Exception('Método HTTP no soportado');
    }

    return response;
  }
}

// EJEMPLO DE USO EN FLUTTER:

class LoginScreen extends StatefulWidget {
  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final authService = AuthService();
  final usernameController = TextEditingController();
  final passwordController = TextEditingController();
  bool isLoading = false;

  void _handleLogin() async {
    setState(() => isLoading = true);

    final result = await authService.login(
      usernameController.text,
      passwordController.text,
    );

    setState(() => isLoading = false);

    if (result['success']) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result['message'])),
      );
      // Navegar a pantalla principal
      Navigator.of(context).pushReplacementNamed('/home');
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result['message']), backgroundColor: Colors.red),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Iniciar Sesión')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            TextField(
              controller: usernameController,
              decoration: const InputDecoration(labelText: 'Usuario'),
            ),
            TextField(
              controller: passwordController,
              decoration: const InputDecoration(labelText: 'Contraseña'),
              obscureText: true,
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: isLoading ? null : _handleLogin,
              child: isLoading
                  ? const CircularProgressIndicator()
                  : const Text('Iniciar Sesión'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    usernameController.dispose();
    passwordController.dispose();
    super.dispose();
  }
}

// PROTEGER RUTAS CON MIDDLEWARE EN FLUTTER:

Future<void> checkAuthAndNavigate() async {
  final authService = AuthService();
  final isAuthenticated = await authService.isAuthenticated();

  if (isAuthenticated) {
    final profile = await authService.getProfile();
    if (profile['success']) {
      // Usuario autenticado y con token válido
      // Navegar a home
    } else {
      // Token expirado, navegar a login
    }
  } else {
    // No hay sesión, navegar a login
  }
}
