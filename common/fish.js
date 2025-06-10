// Vector2D 클래스: 2차원 벡터 연산을 위한 기본 유틸리티
class Vector2D {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    add(other) {
        return new Vector2D(this.x + other.x, this.y + other.y);
    }
    sub(other) {
        return new Vector2D(this.x - other.x, this.y - other.y);
    }
    mul(scalar) {
        return new Vector2D(this.x * scalar, this.y * scalar);
    }
    length() {
        return Math.sqrt(this.x ** 2 + this.y ** 2);
    }
    normalize() {
        const len = this.length();
        if (len === 0) return new Vector2D(0, 0);
        return new Vector2D(this.x / len, this.y / len);
    }
    distanceTo(other) {
        return this.sub(other).length();
    }
}

// FishType 클래스: 물고기 유형별 특성
class FishType {
    constructor(name, maxSpeed, perceptionRadius, avoidanceRadius, randomWanderStrength, color = 'white') {
        this.name = name;
        this.maxSpeed = maxSpeed;
        this.perceptionRadius = perceptionRadius;
        this.avoidanceRadius = avoidanceRadius;
        this.randomWanderStrength = randomWanderStrength;
        this.color = color;
    }
}

// Fish 클래스: 물고기 AI 로직을 포함
class Fish {
    static FISH_SIZE = 64;
    static MARGIN = 40;
    static SMOOTH_FACTOR = 0.1;
    static BEHAVIORS = {
        WANDERING: "WANDERING",
        FLEEING: "FLEEING",
        SEEKING_FOOD: "SEEKING_FOOD",
        HUNTING: "HUNTING"
    };

    constructor(initialPosition, type, svgFilename = null, width = Fish.FISH_SIZE, height = Fish.FISH_SIZE) {
        this.position = initialPosition;
        this.type = type;
        this.maxSpeed = type.maxSpeed;
        this.perceptionRadius = type.perceptionRadius;
        this.avoidanceRadius = type.avoidanceRadius;
        this.randomWanderStrength = type.randomWanderStrength;
        this.color = type.color;
        this.velocity = new Vector2D(Math.random() * 2 - 1, Math.random() * 2 - 1).normalize().mul(this.maxSpeed * 0.5);
        this.maxForce = 500;
        this.currentBehavior = Fish.BEHAVIORS.WANDERING;
        this.currentAngle = 0;
        this.currentFlip = 1;
        this.createFish(svgFilename, width, height);
    }

    createFish(svgFilename = null, width = Fish.FISH_SIZE, height = Fish.FISH_SIZE) {
        const fish = document.createElement('div');
        fish.style.position = 'absolute';
        fish.style.width = `${width}px`;
        fish.style.height = `${height}px`;
        
        if (svgFilename) {
            const img = document.createElement('img');
            img.src = svgFilename;
            img.style.width = `${width}px`;
            img.style.height = `${height}px`;
            img.style.maxWidth = '100%';
            img.style.maxHeight = '100%';
            img.style.objectFit = 'contain';
            img.style.transform = 'scaleX(1)';
            fish.appendChild(img);
            
            img.onerror = () => {
                console.error(`Failed to load SVG: ${svgFilename}`);
                this.applyDefaultStyle(fish);
            };
        } else {
            this.applyDefaultStyle(fish);
        }
        
        fish.style.zIndex = '1';
        this.element = fish;
        document.querySelector('.container').appendChild(fish);
        this.updatePosition();
    }

    applyDefaultStyle(element) {
        element.style.borderRadius = '50% 50% 50% 50%/60% 60% 40% 40%';
        element.style.background = this.color;
        element.style.boxShadow = '2px 2px 8px rgba(0,0,0,0.1)';
    }

    updatePosition() {
        this.element.style.left = `${this.position.x}px`;
        this.element.style.top = `${this.position.y}px`;
        if (this.element.querySelector('img')) {
            let targetAngle = Math.atan2(this.velocity.y, this.velocity.x) * (180 / Math.PI) + 180;
            let delta = targetAngle - this.currentAngle;
            if (delta > 180) delta -= 360;
            if (delta < -180) delta += 360;
            this.currentAngle += delta * 0.15;
            const normAngle = ((this.currentAngle % 360) + 360) % 360;
            const targetFlip = (normAngle > 90 && normAngle < 270) ? -1 : 1;
            this.currentFlip += (targetFlip - this.currentFlip) * 0.15;
            this.element.querySelector('img').style.transform = `rotate(${this.currentAngle}deg) scaleY(${this.currentFlip})`;
        }
    }

    _seekForce(targetPosition) {
        const desiredVelocity = targetPosition.sub(this.position).normalize().mul(this.maxSpeed);
        const steeringForce = desiredVelocity.sub(this.velocity);
        return steeringForce.length() > this.maxForce ? 
            steeringForce.normalize().mul(this.maxForce) : 
            steeringForce;
    }

    _avoidObstaclesForce(obstacles) {
        let totalAvoidanceForce = new Vector2D(0, 0);
        let closestObstacle = null;
        let minDistance = Infinity;

        for (const obstacle of obstacles) {
            const distance = this.position.distanceTo(obstacle);
            if (distance < this.avoidanceRadius && distance < minDistance) {
                minDistance = distance;
                closestObstacle = obstacle;
            }
        }

        if (closestObstacle) {
            const awayFromObstacle = this.position.sub(closestObstacle).normalize();
            const strength = this.maxForce * (1 - (minDistance / this.avoidanceRadius));
            totalAvoidanceForce = awayFromObstacle.mul(strength);
        }

        return totalAvoidanceForce;
    }

    _wanderForce() {
        return new Vector2D(Math.random() * 2 - 1, Math.random() * 2 - 1)
            .normalize()
            .mul(this.randomWanderStrength * 2);
    }

    update(deltaTime, foodSources = [], predators = [], obstacles = [], boundaries = null, fishes = []) {
        let totalForce = new Vector2D(0, 0);
        let target = null;
        let activeBehaviors = [];

        // 포식자 회피
        for (const predator of predators) {
            if (this.position.distanceTo(predator) < this.perceptionRadius) {
                this.currentBehavior = Fish.BEHAVIORS.FLEEING;
                target = this.position.add(this.position.sub(predator).normalize().mul(this.perceptionRadius * 2));
                activeBehaviors.push({ type: "FLEE", weight: 2.0 });
                break;
            }
        }

        // 먹이 추적
        if (this.currentBehavior !== Fish.BEHAVIORS.FLEEING) {
            for (const food of foodSources) {
                if (this.position.distanceTo(food) < this.perceptionRadius) {
                    this.currentBehavior = Fish.BEHAVIORS.SEEKING_FOOD;
                    target = food;
                    activeBehaviors.push({ type: "SEEK", weight: 1.0 });
                    break;
                }
            }
        }

        // 무작위 유영
        if (!target && !activeBehaviors.some(b => b.type === "FLEE" || b.type === "SEEK")) {
            this.currentBehavior = Fish.BEHAVIORS.WANDERING;
            activeBehaviors.push({ type: "WANDER", weight: 0.5 });
        }

        // 군집 행동
        if (this.type.name === "Salmon" || this.type.name === "Guppy") {
            const nearbyFishes = this._getNearbyFishes(fishes, this.perceptionRadius);
            if (nearbyFishes.length > 1) {
                totalForce = totalForce
                    .add(this._calculateCohesion(nearbyFishes).mul(0.8))
                    .add(this._calculateAlignment(nearbyFishes).mul(0.5))
                    .add(this._calculateSeparation(nearbyFishes).mul(1.5));
            }
        }

        // 포식 행동 (상어)
        if (this.type.name === "Shark") {
            const nearbyPrey = this._getNearbyPrey(fishes, this.perceptionRadius);
            if (nearbyPrey.length > 0) {
                this.currentBehavior = Fish.BEHAVIORS.HUNTING;
                totalForce = totalForce.add(this._seekForce(nearbyPrey[0].position).mul(2.5));
            }
        }

        // 표류 행동 (해파리)
        if (this.type.name === "Jellyfish") {
            totalForce = totalForce.add(this._wanderForce().mul(0.2));
        }

        // 행동 가중치 적용
        if (activeBehaviors.some(b => b.type === "FLEE") && target) {
            totalForce = totalForce.add(this._seekForce(target).mul(activeBehaviors.find(b => b.type === "FLEE").weight));
        } else if (activeBehaviors.some(b => b.type === "SEEK") && target) {
            totalForce = totalForce.add(this._seekForce(target).mul(activeBehaviors.find(b => b.type === "SEEK").weight));
        } else if (activeBehaviors.some(b => b.type === "WANDER")) {
            totalForce = totalForce.add(this._wanderForce().mul(activeBehaviors.find(b => b.type === "WANDER").weight));
        }

        // 장애물 회피
        totalForce = totalForce.add(this._avoidObstaclesForce(obstacles));

        // 경계 처리
        if (boundaries) {
            const [minX, maxX, minY, maxY] = boundaries;
            let boundaryForce = new Vector2D(0, 0);
            
            if (this.position.x < minX + Fish.MARGIN) boundaryForce = boundaryForce.add(new Vector2D(1, 0).mul(this.maxForce));
            if (this.position.x > maxX - Fish.MARGIN) boundaryForce = boundaryForce.add(new Vector2D(-1, 0).mul(this.maxForce));
            if (this.position.y < minY + Fish.MARGIN) boundaryForce = boundaryForce.add(new Vector2D(0, 1).mul(this.maxForce));
            if (this.position.y > maxY - Fish.MARGIN) boundaryForce = boundaryForce.add(new Vector2D(0, -1).mul(this.maxForce));
            
            totalForce = totalForce.add(boundaryForce.mul(0.5));
        }

        // 속도 업데이트
        this.velocity = this.velocity.mul(1 - Fish.SMOOTH_FACTOR)
            .add(this.velocity.add(totalForce.mul(deltaTime)).mul(Fish.SMOOTH_FACTOR));

        if (this.velocity.length() > this.maxSpeed) {
            this.velocity = this.velocity.normalize().mul(this.maxSpeed);
        }

        this.position = this.position.add(this.velocity.mul(deltaTime));
        this.updatePosition();
    }

    _getNearbyFishes(allFishes, radius) {
        return allFishes.filter(f => f !== this && this.position.distanceTo(f.position) < radius);
    }

    _getNearbyPrey(allFishes, radius) {
        return allFishes.filter(f => f !== this && f.type.name !== "Shark" && this.position.distanceTo(f.position) < radius);
    }

    _calculateCohesion(nearbyFishes) {
        const centerOfMass = nearbyFishes.reduce((sum, fish) => sum.add(fish.position), new Vector2D(0, 0))
            .mul(1 / nearbyFishes.length);
        return this._seekForce(centerOfMass);
    }

    _calculateAlignment(nearbyFishes) {
        const averageVelocity = nearbyFishes.reduce((sum, fish) => sum.add(fish.velocity), new Vector2D(0, 0))
            .mul(1 / nearbyFishes.length);
        return averageVelocity.normalize().mul(this.maxForce);
    }

    _calculateSeparation(nearbyFishes) {
        const separationForce = nearbyFishes.reduce((force, fish) => {
            const distance = this.position.distanceTo(fish.position);
            return force.add(this.position.sub(fish.position).normalize().mul(1 / distance));
        }, new Vector2D(0, 0));
        return separationForce.normalize().mul(this.maxForce);
    }
}

// 물고기 타입 정의
const FISH_TYPES = {
    SALMON: new FishType("Salmon", 70, 250, 80, 5, 'salmon'),       // 빠르고 무리 지어 다니며 포식자를 잘 피함
    GUPPY: new FishType("Guppy", 30, 90, 40, 20, 'orange'),         // 느리고 작은 범위에서 활발하게 돌아다님
    SHARK: new FishType("Shark", 100, 500, 150, 2, 'darkgray'),    // 매우 빠르고 넓은 범위에서 먹이를 감지하며 공격적
    JELLYFISH: new FishType("Jellyfish", 10, 60, 20, 50, 'purple'),  // 매우 느리고 주로 떠다니는 움직임
    TUNA: new FishType("Tuna", 85, 200, 70, 8, 'blue'),            // 빠르고 먼 거리를 이동하며 비교적 직선적인 움직임
    CLOWNFISH: new FishType("Clownfish", 40, 120, 50, 15, 'orange'), // 느리고 특정 구역 주변에서 맴돌며 높은 무작위 유영 강도
    ANGELFISH: new FishType("Angelfish", 35, 100, 45, 18, 'yellow'), // 우아하고 적당한 속도로 넓지 않은 영역에서 움직임
    BETTA: new FishType("Betta", 25, 80, 35, 25, 'red'),           // 느리고 작은 반경에서 활발하게 움직이며 탐색적
    CATFISH: new FishType("Catfish", 55, 140, 60, 10, 'gray'),     // 중간 속도, 낮은 인지력, 높은 회피력을 가짐
    DISCUS: new FishType("Discus", 28, 95, 30, 22, 'lightblue'),    // 느리고 부드럽게 움직이며, 무작위 유영 강도가 낮음
    GOLDFISH: new FishType("Goldfish", 38, 110, 40, 12, 'gold'),   // 중간 속도, 중간 인지력, 중간 회피력으로 일반적인 움직임
    KOI: new FishType("Koi", 45, 130, 55, 10, 'white'),            // 중간 속도, 적당한 인지력과 회피력으로 안정적인 움직임
};

function getRandomFishType() {
    const types = Object.values(FISH_TYPES);
    return types[Math.floor(Math.random() * types.length)];
}

// 모듈 내보내기
export { Fish, FishType, Vector2D, FISH_TYPES }; 