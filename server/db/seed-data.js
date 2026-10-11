const modules = [
  {
    title: "Introduction to Robotics",
    level: "beginner",

    shortDescription:
      "Learn the basic concepts, parts, and applications of robotics.",

    description:
      "This module introduces learners to the fundamentals of robotics, including common components, basic robot functions, and the role of programming in robotics.",

    objective:
      "By the end of this module, the learner should be able to identify basic robotics components and explain their functions.",

    duration: "30 minutes",

    components: [
      {
        name: "Arduino Uno",
        compartment: "A1",
        quantity: 1,
      },
      {
        name: "Breadboard",
        compartment: "A3",
        quantity: 1,
      },
      {
        name: "Jumper Wires",
        compartment: "D1",
        quantity: 1,
      },
    ],

    steps: [
      {
        number: 1,
        title: "Introduction to Robotics",
        type: "instruction",

        instruction:
          "Learn what robotics is and how robots combine mechanical, electronic, and programming components.",
      },

      {
        number: 2,
        title: "Identify the Components",
        type: "instruction",

        instruction:
          "Locate the Arduino Uno in compartment A1, the breadboard in A3, and jumper wires in D1.",
      },

      {
        number: 3,
        title: "Understand the Robot System",
        type: "instruction",

        instruction:
          "Review how a basic robotic system uses input devices, a controller, and output devices.",
      },
    ],
  },

  {
    title: "LED Control",
    level: "beginner",

    shortDescription:
      "Learn the basics of Arduino digital output by controlling an LED.",

    description:
      "This module introduces learners to a simple Arduino circuit using an LED and resistor. Learners will assemble the circuit and upload a basic Arduino program.",

    objective:
      "By the end of this module, the learner should be able to connect an LED circuit and program an Arduino to control the LED.",

    duration: "45 minutes",

    components: [
      {
        name: "Arduino Uno",
        compartment: "A1",
        quantity: 1,
      },
      {
        name: "Breadboard",
        compartment: "A3",
        quantity: 1,
      },
      {
        name: "LED",
        compartment: "A4",
        quantity: 1,
      },
      {
        name: "Resistor",
        compartment: "A5",
        quantity: 1,
      },
      {
        name: "Jumper Wires",
        compartment: "D1",
        quantity: 1,
      },
    ],

    steps: [
      {
        number: 1,
        title: "Collect the Components",
        type: "instruction",

        instruction:
          "Collect the Arduino Uno from A1, breadboard from A3, LED from A4, resistor from A5, and jumper wires from D1.",
      },

      {
        number: 2,
        title: "Place the LED",
        type: "instruction",

        instruction:
          "Insert the LED into the breadboard. Make sure its two legs are placed in separate rows.",
      },

      {
        number: 3,
        title: "Connect the Resistor",
        type: "instruction",

        instruction:
          "Connect the resistor to the LED circuit to limit the current flowing through the LED.",
      },

      {
        number: 4,
        title: "Connect the Arduino",
        type: "instruction",

        instruction:
          "Use jumper wires to connect the LED circuit to the appropriate Arduino connections.",
      },

      {
        number: 5,
        title: "Arduino Programming",
        type: "arduino",

        instruction:
          "Open the Arduino IDE and enter the program below. Connect the Arduino to the computer using a USB cable, select the correct board and port, then upload the program.",

        codeTitle: "LED Blink: turns the LED on pin 13 on and off every second",

        code: `void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);
  delay(1000);

  digitalWrite(13, LOW);
  delay(1000);
}`,
      },

      {
        number: 6,
        title: "Test the Circuit",
        type: "test",

        instruction:
          "After uploading the program, observe the LED. The LED should turn on for approximately one second and then turn off for approximately one second.",
      },
    ],
  },

  {
    title: "Servo Motor Control",
    level: "intermediate",

    shortDescription:
      "Learn how to control the position of a servo motor using Arduino.",

    description:
      "This module introduces servo motor control using an Arduino. Learners will connect the servo and use a program to move it to different positions.",

    objective:
      "By the end of this module, the learner should be able to connect a servo motor and control its position using Arduino.",

    duration: "60 minutes",

    components: [
      {
        name: "Arduino Uno",
        compartment: "A1",
        quantity: 1,
      },
      {
        name: "Breadboard",
        compartment: "A3",
        quantity: 1,
      },
      {
        name: "Servo Motor",
        compartment: "C1",
        quantity: 1,
      },
      {
        name: "Jumper Wires",
        compartment: "D1",
        quantity: 3,
      },
    ],

    steps: [
      {
        number: 1,
        title: "Collect the Components",
        type: "instruction",

        instruction:
          "Collect the Arduino Uno from A1, breadboard from A3, servo motor from C1, and jumper wires from D1.",
      },

      {
        number: 2,
        title: "Connect the Servo",
        type: "instruction",

        instruction:
          "Connect the servo's brown (or black) wire to GND, the red wire to 5V, and the orange (or yellow) signal wire to digital pin 9 on the Arduino.",
      },

      {
        number: 3,
        title: "Prepare the Program",
        type: "arduino",

        instruction:
          "Open the Arduino IDE, enter the program below, and upload it to the Arduino. The program uses the Servo library, which comes with the Arduino IDE.",

        codeTitle:
          "Servo Sweep: turns the servo from 0° to 180° and back again",

        code: `#include <Servo.h>

const int SERVO_PIN = 9;  // servo signal wire (orange or yellow)

Servo myServo;

void setup() {
  myServo.attach(SERVO_PIN);
}

void loop() {
  // Turn from 0 to 180 degrees, one degree at a time
  for (int angle = 0; angle <= 180; angle++) {
    myServo.write(angle);
    delay(15);
  }

  // Turn back from 180 to 0 degrees
  for (int angle = 180; angle >= 0; angle--) {
    myServo.write(angle);
    delay(15);
  }
}`,
      },

      {
        number: 4,
        title: "Test the Servo",
        type: "test",

        instruction:
          "After uploading, watch the servo arm. It should sweep slowly from one side to the other and back, over and over.",
      },
    ],
  },

  {
    title: "Ultrasonic Distance Sensor",
    level: "intermediate",

    shortDescription: "Learn how an ultrasonic sensor measures distance.",

    description:
      "This module introduces ultrasonic sensing and demonstrates how an Arduino can read distance measurements from an ultrasonic sensor.",

    objective:
      "By the end of this module, the learner should be able to connect an ultrasonic sensor and obtain distance readings using Arduino.",

    duration: "60 minutes",

    components: [
      {
        name: "Arduino Uno",
        compartment: "A1",
        quantity: 1,
      },
      {
        name: "Breadboard",
        compartment: "A3",
        quantity: 1,
      },
      {
        name: "Ultrasonic Sensor",
        compartment: "B1",
        quantity: 1,
      },
      {
        name: "Jumper Wires",
        compartment: "D1",
        quantity: 4,
      },
    ],

    steps: [
      {
        number: 1,
        title: "Collect the Components",
        type: "instruction",

        instruction:
          "Collect the Arduino Uno from A1, breadboard from A3, ultrasonic sensor from B1, and jumper wires from D1.",
      },

      {
        number: 2,
        title: "Connect the Sensor",
        type: "instruction",

        instruction:
          "Connect the sensor's VCC pin to 5V, GND to GND, TRIG to digital pin 9, and ECHO to digital pin 10 on the Arduino.",
      },

      {
        number: 3,
        title: "Read the Distance",
        type: "arduino",

        instruction:
          "Enter the program below in the Arduino IDE and upload it. Then open the Serial Monitor (Tools > Serial Monitor) and set it to 9600 baud to see the readings.",

        codeTitle:
          "Distance Reader: measures the distance in centimetres and shows it on the Serial Monitor",

        code: `const int TRIG_PIN = 9;
const int ECHO_PIN = 10;

void setup() {
  Serial.begin(9600);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
}

void loop() {
  // Send a 10-microsecond pulse to start a measurement
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  // Time how long the echo takes to come back (gives up after 30 ms)
  long duration = pulseIn(ECHO_PIN, HIGH, 30000);

  if (duration == 0) {
    Serial.println("No object in range");
  } else {
    // Sound travels 0.0343 cm per microsecond; divide by 2 for there and back
    float distanceCm = duration * 0.0343 / 2;
    Serial.print("Distance: ");
    Serial.print(distanceCm);
    Serial.println(" cm");
  }

  delay(500);
}`,
      },

      {
        number: 4,
        title: "Test the Sensor",
        type: "test",

        instruction:
          "Move your hand slowly toward and away from the sensor. The distance in the Serial Monitor should get smaller as your hand gets closer.",
      },
    ],
  },

  {
    title: "Mini Obstacle-Avoiding Robot",
    level: "projects",

    shortDescription:
      "Build a small robot that detects obstacles and changes direction.",

    description:
      "This project combines sensing, motor control, and Arduino programming into a practical robotics activity.",

    objective:
      "By the end of this project, the learner should be able to assemble and program a basic obstacle-avoiding robot.",

    duration: "120 minutes",

    components: [
      {
        name: "Arduino Uno",
        compartment: "A1",
        quantity: 1,
      },
      {
        name: "Ultrasonic Sensor",
        compartment: "B1",
        quantity: 1,
      },
      {
        name: "DC Motors",
        compartment: "C2",
        quantity: 2,
      },
      {
        name: "Motor Driver",
        compartment: "C3",
        quantity: 1,
      },
      {
        name: "Wheels",
        compartment: "C4",
        quantity: 2,
      },
      {
        name: "Jumper Wires",
        compartment: "D1",
        quantity: 1,
      },
    ],

    steps: [
      {
        number: 1,
        title: "Prepare the Components",
        type: "instruction",

        instruction:
          "Collect the listed components from their assigned compartments.",
      },

      {
        number: 2,
        title: "Assemble the Robot",
        type: "instruction",

        instruction:
          "Mount the motors, wheels, Arduino, motor driver, and ultrasonic sensor on the robot structure. Point the ultrasonic sensor forward.",
      },

      {
        number: 3,
        title: "Connect the Electronics",
        type: "instruction",

        instruction:
          "Connect motor driver inputs IN1, IN2, IN3 and IN4 to Arduino pins 2, 3, 4 and 5. Connect the left motor to OUT1/OUT2 and the right motor to OUT3/OUT4. Connect the ultrasonic sensor's VCC to 5V, GND to GND, TRIG to pin 9 and ECHO to pin 10. Make sure the motor driver and the Arduino share a common GND.",
      },

      {
        number: 4,
        title: "Program the Robot",
        type: "arduino",

        instruction:
          "Enter the program below in the Arduino IDE and upload it. Then disconnect the USB cable and switch on the robot's power before testing.",

        codeTitle:
          "Obstacle Avoider: drives forward, then backs up and turns right when something is closer than 20 cm",

        code: `const int TRIG_PIN = 9;
const int ECHO_PIN = 10;

// Motor driver inputs: left motor = IN1/IN2, right motor = IN3/IN4
const int LEFT_FWD = 2;
const int LEFT_BACK = 3;
const int RIGHT_FWD = 4;
const int RIGHT_BACK = 5;

const int SAFE_DISTANCE_CM = 20;  // closer than this counts as an obstacle

void setup() {
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(LEFT_FWD, OUTPUT);
  pinMode(LEFT_BACK, OUTPUT);
  pinMode(RIGHT_FWD, OUTPUT);
  pinMode(RIGHT_BACK, OUTPUT);
}

// Measure the distance in front of the robot, in centimetres
long readDistanceCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  if (duration == 0) return 999;  // no echo: nothing in range
  return duration * 0.0343 / 2;
}

// Set all four motor driver inputs at once
void drive(int leftFwd, int leftBack, int rightFwd, int rightBack) {
  digitalWrite(LEFT_FWD, leftFwd);
  digitalWrite(LEFT_BACK, leftBack);
  digitalWrite(RIGHT_FWD, rightFwd);
  digitalWrite(RIGHT_BACK, rightBack);
}

void loop() {
  long distance = readDistanceCm();

  if (distance < SAFE_DISTANCE_CM) {
    drive(LOW, LOW, LOW, LOW);    // stop
    delay(200);
    drive(LOW, HIGH, LOW, HIGH);  // back up
    delay(400);
    drive(HIGH, LOW, LOW, HIGH);  // turn right: left wheel forward, right wheel back
    delay(400);
  } else {
    drive(HIGH, LOW, HIGH, LOW);  // go forward
  }

  delay(50);
}`,
      },

      {
        number: 5,
        title: "Test the Robot",
        type: "test",

        instruction:
          "Place the robot on a clear surface and put an object in its path. It should stop, back up, turn right, and continue. If a wheel spins the wrong way, swap that motor's two wires on the motor driver.",
      },
    ],
  },
];

export default modules;
