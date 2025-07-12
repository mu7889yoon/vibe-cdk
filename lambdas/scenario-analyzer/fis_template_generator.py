import json
from typing import Dict, List, Any
import logging

logger = logging.getLogger()

class FISTemplateGenerator:
    """
    シナリオ分析結果をもとに FIS 実験テンプレート JSON を生成
    """
    
    def __init__(self):
        self.actions = {}
        self.stop_conditions = []
        self.targets = {}
        
    def generate_fis_template(self, aws_services: List[str], scenario_json: Dict[str, Any]) -> Dict[str, Any]:
        """
        FIS 実験テンプレート JSON を生成
        """
        self.actions.clear()
        self.stop_conditions.clear()
        self.targets.clear()
        
        scenario_name = scenario_json.get('scenario_name', 'ChaosTest')
        description = scenario_json.get('purpose', 'Chaos Engineering Test')
        
        # AWS サービスごとのアクション生成
        for service in aws_services:
            self._generate_service_actions(service, scenario_json)
        
        # ストップ条件の設定
        self._generate_stop_conditions(scenario_json)
        
        # FIS テンプレートの組み立て
        return self._assemble_fis_template(scenario_name, description)
    
    def _generate_service_actions(self, service: str, scenario_json: Dict[str, Any]):
        """
        サービス別のアクション生成
        """
        if service == 'EC2':
            self._generate_ec2_actions(scenario_json)
        elif service == 'RDS':
            self._generate_rds_actions(scenario_json)
        elif service == 'Lambda':
            self._generate_lambda_actions(scenario_json)
        elif service == 'ELB':
            self._generate_elb_actions(scenario_json)
        elif service == 'ECS':
            self._generate_ecs_actions(scenario_json)
        elif service == 'EKS':
            self._generate_eks_actions(scenario_json)
    
    def _generate_ec2_actions(self, scenario_json: Dict[str, Any]):
        """EC2 関連のアクション生成"""
        # EC2 インスタンス停止アクション
        self.actions['stop-instances'] = {
            'actionId': 'aws:ec2:stop-instances',
            'description': 'EC2 インスタンスの停止',
            'parameters': {
                'startInstancesAfterDuration': 'PT10M'
            },
            'targets': {
                'Instances': 'ec2-instances'
            }
        }
        
        # EC2 インスタンス再起動アクション
        self.actions['reboot-instances'] = {
            'actionId': 'aws:ec2:reboot-instances',
            'description': 'EC2 インスタンスの再起動',
            'targets': {
                'Instances': 'ec2-instances'
            }
        }
        
        # CPU ストレステスト
        self.actions['cpu-stress'] = {
            'actionId': 'aws:ssm:send-command',
            'description': 'CPU ストレステスト',
            'parameters': {
                'documentArn': 'arn:aws:ssm:*:*:document/AWSFIS-Run-CPU-Stress',
                'documentParameters': json.dumps({
                    'DurationSeconds': '600',
                    'CPU': '0'
                }),
                'duration': 'PT10M'
            },
            'targets': {
                'Instances': 'ec2-instances'
            }
        }
        
        # ターゲット設定
        self.targets['ec2-instances'] = {
            'resourceType': 'aws:ec2:instance',
            'resourceTags': {
                'Project': 'ChaosEngineering'
            },
            'selectionMode': 'ALL'
        }
    
    def _generate_rds_actions(self, scenario_json: Dict[str, Any]):
        """RDS 関連のアクション生成"""
        # RDS インスタンス再起動アクション
        self.actions['reboot-db-instances'] = {
            'actionId': 'aws:rds:reboot-db-instances',
            'description': 'RDS インスタンスの再起動',
            'targets': {
                'DBInstances': 'rds-instances'
            }
        }
        
        # RDS フェイルオーバー（Multi-AZ の場合）
        self.actions['failover-db-cluster'] = {
            'actionId': 'aws:rds:failover-db-cluster',
            'description': 'RDS クラスターのフェイルオーバー',
            'targets': {
                'Clusters': 'rds-clusters'
            }
        }
        
        # ターゲット設定
        self.targets['rds-instances'] = {
            'resourceType': 'aws:rds:db',
            'resourceTags': {
                'Project': 'ChaosEngineering'
            },
            'selectionMode': 'ALL'
        }
        
        self.targets['rds-clusters'] = {
            'resourceType': 'aws:rds:cluster',
            'resourceTags': {
                'Project': 'ChaosEngineering'
            },
            'selectionMode': 'ALL'
        }
    
    def _generate_lambda_actions(self, scenario_json: Dict[str, Any]):
        """Lambda 関連のアクション生成"""
        # Lambda 関数の並行実行制限
        self.actions['throttle-lambda'] = {
            'actionId': 'aws:lambda:invocation-add-delay',
            'description': 'Lambda 関数の遅延追加',
            'parameters': {
                'delay': '5000',
                'jitterRate': '0.1'
            },
            'targets': {
                'Functions': 'lambda-functions'
            }
        }
        
        # Lambda 関数のエラー注入
        self.actions['lambda-error-injection'] = {
            'actionId': 'aws:lambda:invocation-error',
            'description': 'Lambda 関数のエラー注入',
            'parameters': {
                'errorType': 'StatusCode',
                'errorValue': '500'
            },
            'targets': {
                'Functions': 'lambda-functions'
            }
        }
        
        # ターゲット設定
        self.targets['lambda-functions'] = {
            'resourceType': 'aws:lambda:function',
            'resourceTags': {
                'Project': 'ChaosEngineering'
            },
            'selectionMode': 'ALL'
        }
    
    def _generate_elb_actions(self, scenario_json: Dict[str, Any]):
        """ELB 関連のアクション生成"""
        # ALB ターゲット登録解除
        self.actions['deregister-targets'] = {
            'actionId': 'aws:elbv2:deregister-targets',
            'description': 'ALB ターゲットの登録解除',
            'parameters': {
                'reregisterTargetsAfterDuration': 'PT10M'
            },
            'targets': {
                'LoadBalancers': 'alb-load-balancers'
            }
        }
        
        # ターゲット設定
        self.targets['alb-load-balancers'] = {
            'resourceType': 'aws:elbv2:load-balancer',
            'resourceTags': {
                'Project': 'ChaosEngineering'
            },
            'selectionMode': 'ALL'
        }
    
    def _generate_ecs_actions(self, scenario_json: Dict[str, Any]):
        """ECS 関連のアクション生成"""
        # ECS タスク停止
        self.actions['stop-ecs-tasks'] = {
            'actionId': 'aws:ecs:stop-task',
            'description': 'ECS タスクの停止',
            'targets': {
                'Tasks': 'ecs-tasks'
            }
        }
        
        # ターゲット設定
        self.targets['ecs-tasks'] = {
            'resourceType': 'aws:ecs:task',
            'resourceTags': {
                'Project': 'ChaosEngineering'
            },
            'selectionMode': 'PERCENT(50)'
        }
    
    def _generate_eks_actions(self, scenario_json: Dict[str, Any]):
        """EKS 関連のアクション生成"""
        # EKS Pod 削除
        self.actions['kill-eks-pods'] = {
            'actionId': 'aws:eks:pod-delete',
            'description': 'EKS Pod の削除',
            'targets': {
                'Pods': 'eks-pods'
            }
        }
        
        # ターゲット設定
        self.targets['eks-pods'] = {
            'resourceType': 'aws:eks:pod',
            'resourceTags': {
                'Project': 'ChaosEngineering'
            },
            'selectionMode': 'PERCENT(25)'
        }
    
    def _generate_stop_conditions(self, scenario_json: Dict[str, Any]):
        """
        ストップ条件の生成
        """
        # CloudWatch アラームベースのストップ条件
        self.stop_conditions.append({
            'source': 'aws:cloudwatch:alarm',
            'value': 'arn:aws:cloudwatch:*:*:alarm:*'
        })
        
        # 手動ストップ条件
        self.stop_conditions.append({
            'source': 'none'
        })
    
    def _assemble_fis_template(self, scenario_name: str, description: str) -> Dict[str, Any]:
        """
        FIS テンプレートの組み立て
        """
        template = {
            'description': f'{scenario_name}: {description}',
            'actions': self.actions,
            'stopConditions': self.stop_conditions,
            'targets': self.targets,
            'roleArn': 'arn:aws:iam::ACCOUNT_ID:role/FISRole',
            'tags': {
                'Project': 'ChaosEngineering',
                'Scenario': scenario_name,
                'Environment': 'test'
            }
        }
        
        return template 