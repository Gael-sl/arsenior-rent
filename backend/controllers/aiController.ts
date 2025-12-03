import { Request, Response } from 'express';
import Groq from 'groq-sdk';

interface CarSpecsRequest {
  brand: string;
  model: string;
  year: number;
}

interface CarSpecs {
  engine: {
    type: string;
    displacement: string;
    horsepower: string;
    torque: string;
  };
  performance: {
    topSpeed: string;
    acceleration: string;
    fuelConsumption: string;
  };
  dimensions: {
    trunkCapacity: string;
    fuelTankCapacity: string;
    weight: string;
  };
  technology: {
    infotainment: string[];
    safety: string[];
    comfort: string[];
  };
  summary: string;
}

export const getCarSpecs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { brand, model, year } = req.body as CarSpecsRequest;

    if (!brand || !model || !year) {
      res.status(400).json({ message: 'Se requiere marca, modelo y año del vehículo' });
      return;
    }

    // Verificar que la API key esté configurada
    if (!process.env.GROQ_API_KEY) {
      res.status(500).json({ message: 'API key de Groq no configurada' });
      return;
    }

    // Inicializar Groq
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });

    const prompt = `Proporciona información técnica detallada y precisa sobre el ${brand} ${model} ${year}. 
    
Responde ÚNICAMENTE con un JSON válido (sin markdown, sin backticks, sin texto adicional antes o después) con esta estructura exacta:
{
  "engine": {
    "type": "tipo de motor (ej: 4 cilindros turbo, V6, híbrido, etc.)",
    "displacement": "cilindrada en litros (ej: 2.0L)",
    "horsepower": "caballos de fuerza (ej: 180 HP)",
    "torque": "torque en Nm (ej: 320 Nm)"
  },
  "performance": {
    "topSpeed": "velocidad máxima en km/h (ej: 220 km/h)",
    "acceleration": "0-100 km/h en segundos (ej: 7.5 segundos)",
    "fuelConsumption": "consumo combinado (ej: 12.5 km/L)"
  },
  "dimensions": {
    "trunkCapacity": "capacidad de cajuela en litros (ej: 480 L)",
    "fuelTankCapacity": "capacidad del tanque (ej: 55 L)",
    "weight": "peso en kg (ej: 1,450 kg)"
  },
  "technology": {
    "infotainment": ["Android Auto", "Apple CarPlay", "Pantalla táctil 8 pulgadas"],
    "safety": ["6 airbags", "ABS", "Control de estabilidad"],
    "comfort": ["Aire acondicionado", "Asientos de tela", "Volante ajustable"]
  },
  "summary": "Un párrafo breve (2-3 oraciones) en español resumiendo las características destacadas del vehículo"
}

IMPORTANTE: Responde SOLO con el JSON, sin ningún texto antes o después.`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'Eres un experto en automóviles. Proporcionas información técnica precisa sobre vehículos. SIEMPRE respondes SOLO con JSON válido, sin texto adicional, sin markdown.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 1000
    });

    const responseText = completion.choices[0]?.message?.content || '';
    
    // Limpiar la respuesta
    let cleanedResponse = responseText.trim();
    
    // Remover backticks de markdown si existen
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.slice(7);
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.slice(3);
    }
    if (cleanedResponse.endsWith('```')) {
      cleanedResponse = cleanedResponse.slice(0, -3);
    }
    cleanedResponse = cleanedResponse.trim();

    try {
      const specs: CarSpecs = JSON.parse(cleanedResponse);
      res.json({
        success: true,
        data: specs,
        vehicle: `${brand} ${model} ${year}`
      });
    } catch (parseError) {
      console.error('Error parsing AI response:', cleanedResponse);
      res.status(500).json({ 
        message: 'Error al procesar la respuesta de IA',
        raw: cleanedResponse 
      });
    }

  } catch (error: any) {
    console.error('Error en AI:', error?.message || error);
    
    if (error?.message?.includes('API') || error?.message?.includes('key')) {
      res.status(500).json({ message: 'API key de Groq inválida' });
      return;
    }
    
    if (error?.status === 429) {
      res.status(429).json({ message: 'Límite de solicitudes excedido. Intenta más tarde.' });
      return;
    }

    res.status(500).json({ 
      message: 'Error al obtener información del vehículo',
      detail: error?.message || 'Error desconocido'
    });
  }
};
