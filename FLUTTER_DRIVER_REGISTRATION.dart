// FLUTTER - Servicio de Registro como Chofer
// Instalar dependencias adicionales:
// flutter pub add image_picker

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import 'dart:convert';

class DriverRegistrationService {
  final String baseUrl = 'http://tu-servidor.com/api';
  final _imagePicker = ImagePicker();

  /// Registrar usuario como chofer
  Future<Map<String, dynamic>> registerAsDriver({
    required String token,
    required String plate,
    required String color,
    required String model,
    required int year,
    required String brand,
    required File idCardImage,
  }) async {
    try {
      var request = http.MultipartRequest(
        'POST',
        Uri.parse('$baseUrl/driver/become-driver'),
      );

      // Agregar headers de autenticación
      request.headers.addAll({
        'Authorization': 'Bearer $token',
      });

      // Agregar campos de texto
      request.fields['plate'] = plate;
      request.fields['color'] = color;
      request.fields['model'] = model;
      request.fields['year'] = year.toString();
      request.fields['brand'] = brand;

      // Agregar archivo
      request.files.add(
        await http.MultipartFile.fromPath(
          'idCard',
          idCardImage.path,
          filename: 'id_card_${DateTime.now().millisecondsSinceEpoch}.jpg',
        ),
      );

      var response = await request.send();
      var responseBody = await response.stream.bytesToString();
      var data = jsonDecode(responseBody);

      if (response.statusCode == 201) {
        return {
          'success': true,
          'message': data['message'],
          'driver': data['driver'],
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Error en el registro',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Error de conexión: $e',
      };
    }
  }

  /// Seleccionar imagen del carnet
  Future<File?> pickIdCardImage() async {
    try {
      final XFile? pickedFile = await _imagePicker.pickImage(
        source: ImageSource.camera,
        imageQuality: 80,
      );

      if (pickedFile != null) {
        return File(pickedFile.path);
      }
      return null;
    } catch (e) {
      print('Error seleccionando imagen: $e');
      return null;
    }
  }

  /// Obtener información del chofer
  Future<Map<String, dynamic>> getDriverInfo(String driverId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/driver/driver/$driverId'),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        return {
          'success': false,
          'message': 'Error al obtener información del chofer',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Error de conexión: $e',
      };
    }
  }

  /// Actualizar disponibilidad
  Future<Map<String, dynamic>> updateAvailability({
    required String token,
    required bool isAvailable,
  }) async {
    try {
      final response = await http.patch(
        Uri.parse('$baseUrl/driver/driver/availability'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'isAvailable': isAvailable,
        }),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
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

  /// Obtener lista de choferes disponibles
  Future<Map<String, dynamic>> getAvailableDrivers() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/driver/drivers/available'),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        return {
          'success': false,
          'message': 'Error al obtener choferes',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Error de conexión: $e',
      };
    }
  }
}

// PANTALLA DE REGISTRO COMO CHOFER

class DriverRegistrationScreen extends StatefulWidget {
  final String token;

  const DriverRegistrationScreen({required this.token});

  @override
  _DriverRegistrationScreenState createState() =>
      _DriverRegistrationScreenState();
}

class _DriverRegistrationScreenState extends State<DriverRegistrationScreen> {
  final driverService = DriverRegistrationService();
  final formKey = GlobalKey<FormState>();

  // Controladores de formulario
  final plateController = TextEditingController();
  final colorController = TextEditingController();
  final modelController = TextEditingController();
  final yearController = TextEditingController();
  final brandController = TextEditingController();

  File? selectedIdCard;
  bool isLoading = false;

  Future<void> _pickIdCard() async {
    final image = await driverService.pickIdCardImage();
    if (image != null) {
      setState(() => selectedIdCard = image);
    }
  }

  Future<void> _submitForm() async {
    if (!formKey.currentState!.validate()) return;
    if (selectedIdCard == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Debes seleccionar una foto del carnet'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() => isLoading = true);

    final result = await driverService.registerAsDriver(
      token: widget.token,
      plate: plateController.text.toUpperCase(),
      color: colorController.text,
      model: modelController.text,
      year: int.parse(yearController.text),
      brand: brandController.text,
      idCardImage: selectedIdCard!,
    );

    setState(() => isLoading = false);

    if (result['success']) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result['message'])),
      );
      // Navegar a pantalla de confirmación
      Navigator.of(context).pushReplacementNamed('/driver-profile');
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result['message']),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Registrarse como Chofer'),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Datos del Vehículo
              const Text(
                'Datos del Vehículo',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),

              // Placa
              TextFormField(
                controller: plateController,
                decoration: const InputDecoration(
                  labelText: 'Placa (ej: ABC123)',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) return 'Placa requerida';
                  if (value.length < 5) return 'Placa inválida';
                  return null;
                },
              ),
              const SizedBox(height: 12),

              // Color
              TextFormField(
                controller: colorController,
                decoration: const InputDecoration(
                  labelText: 'Color',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) return 'Color requerido';
                  return null;
                },
              ),
              const SizedBox(height: 12),

              // Marca y Modelo en fila
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: brandController,
                      decoration: const InputDecoration(
                        labelText: 'Marca',
                        border: OutlineInputBorder(),
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty)
                          return 'Marca requerida';
                        return null;
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: modelController,
                      decoration: const InputDecoration(
                        labelText: 'Modelo',
                        border: OutlineInputBorder(),
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty)
                          return 'Modelo requerido';
                        return null;
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Año
              TextFormField(
                controller: yearController,
                decoration: const InputDecoration(
                  labelText: 'Año',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.number,
                validator: (value) {
                  if (value == null || value.isEmpty) return 'Año requerido';
                  final year = int.tryParse(value);
                  if (year == null || year < 1900 || year > DateTime.now().year + 1) {
                    return 'Año inválido';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 24),

              // Documento de Identidad
              const Text(
                'Documento de Identidad',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),

              // Mostrar imagen seleccionada
              if (selectedIdCard != null)
                Container(
                  width: double.infinity,
                  height: 200,
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.grey),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Image.file(
                    selectedIdCard!,
                    fit: BoxFit.cover,
                  ),
                ),

              const SizedBox(height: 12),

              // Botón para seleccionar imagen
              ElevatedButton.icon(
                onPressed: isLoading ? null : _pickIdCard,
                icon: const Icon(Icons.camera_alt),
                label: Text(
                  selectedIdCard == null
                      ? 'Tomar foto del carnet'
                      : 'Cambiar foto',
                ),
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 50),
                ),
              ),

              const SizedBox(height: 24),

              // Botón de envío
              ElevatedButton(
                onPressed: isLoading ? null : _submitForm,
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 50),
                ),
                child: isLoading
                    ? const CircularProgressIndicator()
                    : const Text('Registrarse como Chofer'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    plateController.dispose();
    colorController.dispose();
    modelController.dispose();
    yearController.dispose();
    brandController.dispose();
    super.dispose();
  }
}

// PANTALLA PARA VER LISTA DE CHOFERES DISPONIBLES

class AvailableDriversScreen extends StatefulWidget {
  @override
  _AvailableDriversScreenState createState() => _AvailableDriversScreenState();
}

class _AvailableDriversScreenState extends State<AvailableDriversScreen> {
  final driverService = DriverRegistrationService();
  late Future<Map<String, dynamic>> availableDrivers;

  @override
  void initState() {
    super.initState();
    availableDrivers = driverService.getAvailableDrivers();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Choferes Disponibles'),
      ),
      body: FutureBuilder<Map<String, dynamic>>(
        future: availableDrivers,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          }

          final data = snapshot.data;
          if (data == null || !data['success']) {
            return const Center(child: Text('No hay choferes disponibles'));
          }

          final drivers = data['drivers'] as List;

          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: drivers.length,
            itemBuilder: (context, index) {
              final driver = drivers[index];
              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: Padding(
                  padding: const EdgeInsets.all(12.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        driver['username'],
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text('Teléfono: ${driver['phone']}'),
                      const SizedBox(height: 8),
                      Text(
                        '${driver['car']['brand']} ${driver['car']['model']} (${driver['car']['year']})',
                      ),
                      Text('Placa: ${driver['car']['plate']}'),
                      Text('Color: ${driver['car']['color']}'),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('⭐ ${driver['rating']}'),
                          Text('${driver['completedTrips']} viajes'),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
